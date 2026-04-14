# Deals Module Phase 2A — Asset Managers, Dashboard, News

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the three remaining standalone pages — Asset Manager registry (list + detail), Deals Dashboard (pipeline summary, tasks, team activity, allocation overview, funnel), and News feed (aggregated news, daily report). After this phase, all 7 sidebar pages have real UI.

**Architecture:** Backend adds asset manager CRUD endpoints and dashboard summary endpoints to the existing deals router. Frontend adds 3 new page components and their supporting components. All follow patterns established in Phase 1.

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), React 19, TypeScript, Zustand, shadcn/ui, Tailwind CSS, Recharts (for funnel chart)

**Spec:** `docs/superpowers/specs/2026-04-11-deals-module-design.md` — Sections 2 (Dashboard), 8 (Asset Managers), 9 (News)

**Depends on:** Phase 1 complete (models, schemas, store, routing all in place)

---

## File Map

### Backend (new/modified)

```
server/app/modules/deals/
  repository.py      — ADD: asset manager CRUD queries, dashboard summary queries
  service.py         — ADD: asset manager CRUD, dashboard summary, news item helpers
  schemas.py         — ADD: AssetManager schemas, DashboardSummary schema, NewsItem schema
  router.py          — ADD: /asset-managers/*, /dashboard/*, /news/* endpoints
  models.py          — ADD: NewsItem, NewsOpportunityLink models
```

### Frontend (new files)

```
client/src/modules/deals/
  pages/
    AssetManagerListPage.tsx
    AssetManagerDetailPage.tsx
    NewsPage.tsx
  components/
    asset-managers/
      AssetManagerTable.tsx
      AssetManagerProfile.tsx
      AssetManagerForm.tsx
      LinkedOpportunities.tsx
    dashboard/
      PipelineSummary.tsx
      MyTasks.tsx
      TeamActivity.tsx
      AllocationOverview.tsx
      RecentNews.tsx
      PipelineFunnel.tsx
    news/
      NewsFeed.tsx
      NewsCard.tsx
      DailyReportButton.tsx
```

### Frontend (modified)

```
client/src/modules/deals/
  types.ts            — ADD: AssetManager, NewsItem, DashboardSummary types
  api.ts              — ADD: asset manager, dashboard, news API functions
  store.ts            — ADD: assetManagers, newsItems, dashboardSummary state + actions
  pages/DashboardPage.tsx  — REPLACE: placeholder with real dashboard
client/src/App.tsx    — ADD: asset-manager and news routes
```

---

## Task 1: Backend — Asset Manager CRUD & News Models

**Files:**
- Modify: `server/app/modules/deals/models.py`
- Modify: `server/app/modules/deals/schemas.py`
- Modify: `server/app/modules/deals/repository.py`
- Modify: `server/app/modules/deals/service.py`
- Modify: `server/app/modules/deals/router.py`

### Steps

- [ ] **Step 1: Add NewsItem and NewsOpportunityLink models**

Add to `server/app/modules/deals/models.py`:

```python
class NewsItem(Base, TenantMixin, TimestampMixin):
    """AI-generated news item linked to opportunities."""

    __tablename__ = "news_items"
    __table_args__ = (
        Index("ix_news_items_tenant", "tenant_id"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    headline: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    opportunity_links: Mapped[list["NewsOpportunityLink"]] = relationship(
        back_populates="news_item", cascade="all, delete-orphan", lazy="selectin"
    )


class NewsOpportunityLink(Base):
    """Junction table linking news items to opportunities."""

    __tablename__ = "news_opportunity_links"
    __table_args__ = {"schema": "deals"}

    news_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.news_items.id", ondelete="CASCADE"),
        primary_key=True,
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.opportunities.id", ondelete="CASCADE"),
        primary_key=True,
    )

    news_item: Mapped["NewsItem"] = relationship(back_populates="opportunity_links")
    opportunity: Mapped["Opportunity"] = relationship()
```

Note: Add `from datetime import datetime` and `from sqlalchemy import DateTime, func` to imports if not already present.

- [ ] **Step 2: Generate and run Alembic migration**

```bash
cd server
alembic revision --autogenerate -m "deals: add news_items and news_opportunity_links"
alembic upgrade head
```

- [ ] **Step 3: Add Pydantic schemas for asset managers, news, and dashboard**

Add to `server/app/modules/deals/schemas.py`:

```python
# ── Asset Managers ──────────────────────────────────────────────────

class AssetManagerResponse(BaseModel):
    id: str
    name: str
    type: str | None
    location: str | None
    description: str | None
    fundInfo: dict
    firmInfo: dict
    strategy: dict
    characteristics: dict
    createdByType: str
    createdAt: datetime
    updatedAt: datetime


class AssetManagerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str | None = None
    location: str | None = None
    description: str | None = None
    fundInfo: dict = {}
    firmInfo: dict = {}
    strategy: dict = {}
    characteristics: dict = {}


class AssetManagerUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    location: str | None = None
    description: str | None = None
    fundInfo: dict | None = None
    firmInfo: dict | None = None
    strategy: dict | None = None
    characteristics: dict | None = None


# ── News ────────────────────────────────────────────────────────────

class NewsItemResponse(BaseModel):
    id: str
    headline: str
    summary: str | None
    fullContent: str | None
    category: str | None
    sourceUrl: str | None
    linkedOpportunityIds: list[str]
    generatedAt: datetime
    createdAt: datetime


# ── Dashboard ───────────────────────────────────────────────────────

class PipelineStatusCount(BaseModel):
    status: str
    count: int


class MandateAllocationSummary(BaseModel):
    mandateId: str
    mandateName: str
    targetAllocation: float | None
    currentAllocation: float
    opportunityCount: int


class DashboardSummaryResponse(BaseModel):
    pipelineCounts: list[PipelineStatusCount]
    totalOpportunities: int
    mandateAllocations: list[MandateAllocationSummary]
    recentNews: list[NewsItemResponse]
```

- [ ] **Step 4: Add asset manager repository functions**

Add to `server/app/modules/deals/repository.py`:

```python
from app.modules.deals.models import AssetManager, NewsItem

# ── Asset Managers ──────────────────────────────────────────────────

async def list_asset_managers(
    db: AsyncSession, tenant_id: uuid.UUID, type_filter: str | None = None
) -> list[AssetManager]:
    stmt = select(AssetManager).where(AssetManager.tenant_id == tenant_id)
    if type_filter:
        stmt = stmt.where(AssetManager.type == type_filter)
    stmt = stmt.order_by(AssetManager.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID
) -> AssetManager | None:
    result = await db.execute(
        select(AssetManager).where(AssetManager.tenant_id == tenant_id, AssetManager.id == am_id)
    )
    return result.scalar_one_or_none()


async def create_asset_manager(db: AsyncSession, am: AssetManager) -> AssetManager:
    db.add(am)
    await db.flush()
    return am


async def update_asset_manager(db: AsyncSession, am: AssetManager, data: dict) -> AssetManager:
    for key, value in data.items():
        if value is not None:
            setattr(am, key, value)
    await db.flush()
    return am


async def delete_asset_manager(db: AsyncSession, am: AssetManager) -> None:
    await db.delete(am)
    await db.flush()


async def count_opportunities_for_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID
) -> int:
    result = await db.execute(
        select(func.count()).where(
            Opportunity.tenant_id == tenant_id,
            Opportunity.asset_manager_id == am_id,
        )
    )
    return result.scalar_one()


# ── News ────────────────────────────────────────────────────────────

async def list_news_items(
    db: AsyncSession, tenant_id: uuid.UUID, category: str | None = None, limit: int = 50
) -> list[NewsItem]:
    stmt = select(NewsItem).where(NewsItem.tenant_id == tenant_id)
    if category:
        stmt = stmt.where(NewsItem.category == category)
    stmt = stmt.order_by(NewsItem.generated_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── Dashboard ───────────────────────────────────────────────────────

async def get_mandate_allocation_summaries(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[dict]:
    """Get active mandates with their opportunity counts. Allocation tracking is Phase 2B+."""
    mandates = await list_mandates(db, tenant_id, status="active")
    result = []
    for m in mandates:
        opp_count_result = await db.execute(
            select(func.count()).select_from(Opportunity).where(
                Opportunity.tenant_id == tenant_id,
                Opportunity.pipeline_status.in_(["new", "active"]),
            )
        )
        opp_count = opp_count_result.scalar_one()
        result.append({
            "mandate_id": str(m.id),
            "mandate_name": m.name,
            "target_allocation": float(m.target_allocation) if m.target_allocation else None,
            "current_allocation": 0.0,  # Allocation tracking in Phase 2B
            "opportunity_count": opp_count,
        })
    return result
```

- [ ] **Step 5: Add asset manager and dashboard service functions**

Add to `server/app/modules/deals/service.py`:

```python
from app.modules.deals.models import AssetManager, NewsItem
from app.modules.deals.schemas import (
    AssetManagerCreate, AssetManagerResponse, AssetManagerUpdate,
    DashboardSummaryResponse, MandateAllocationSummary, NewsItemResponse,
    PipelineStatusCount,
)


def _asset_manager_to_response(am: AssetManager) -> AssetManagerResponse:
    return AssetManagerResponse(
        id=str(am.id),
        name=am.name,
        type=am.type,
        location=am.location,
        description=am.description,
        fundInfo=am.fund_info,
        firmInfo=am.firm_info,
        strategy=am.strategy,
        characteristics=am.characteristics,
        createdByType=am.created_by_type,
        createdAt=am.created_at,
        updatedAt=am.updated_at,
    )


def _news_item_to_response(item: NewsItem) -> NewsItemResponse:
    return NewsItemResponse(
        id=str(item.id),
        headline=item.headline,
        summary=item.summary,
        fullContent=item.full_content,
        category=item.category,
        sourceUrl=item.source_url,
        linkedOpportunityIds=[str(link.opportunity_id) for link in item.opportunity_links],
        generatedAt=item.generated_at,
        createdAt=item.created_at,
    )


# ── Asset Managers ──────────────────────────────────────────────────

async def list_asset_managers(
    db: AsyncSession, tenant_id: uuid.UUID, type_filter: str | None = None
) -> list[AssetManagerResponse]:
    ams = await repo.list_asset_managers(db, tenant_id, type_filter)
    return [_asset_manager_to_response(am) for am in ams]


async def get_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID
) -> AssetManagerResponse:
    am = await repo.get_asset_manager(db, tenant_id, am_id)
    if not am:
        raise not_found("Asset manager not found")
    return _asset_manager_to_response(am)


async def create_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, data: AssetManagerCreate
) -> AssetManagerResponse:
    am = AssetManager(
        tenant_id=tenant_id,
        name=data.name,
        type=data.type,
        location=data.location,
        description=data.description,
        fund_info=data.fundInfo,
        firm_info=data.firmInfo,
        strategy=data.strategy,
        characteristics=data.characteristics,
        created_by_type="manual",
    )
    created = await repo.create_asset_manager(db, am)
    return _asset_manager_to_response(created)


async def update_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID, data: AssetManagerUpdate
) -> AssetManagerResponse:
    am = await repo.get_asset_manager(db, tenant_id, am_id)
    if not am:
        raise not_found("Asset manager not found")
    update_data = {}
    for field in ["name", "type", "location", "description"]:
        val = getattr(data, field, None)
        if val is not None:
            update_data[field] = val
    if data.fundInfo is not None:
        update_data["fund_info"] = data.fundInfo
    if data.firmInfo is not None:
        update_data["firm_info"] = data.firmInfo
    if data.strategy is not None:
        update_data["strategy"] = data.strategy
    if data.characteristics is not None:
        update_data["characteristics"] = data.characteristics
    updated = await repo.update_asset_manager(db, am, update_data)
    return _asset_manager_to_response(updated)


async def delete_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID
) -> None:
    am = await repo.get_asset_manager(db, tenant_id, am_id)
    if not am:
        raise not_found("Asset manager not found")
    await repo.delete_asset_manager(db, am)


# ── News ────────────────────────────────────────────────────────────

async def list_news_items(
    db: AsyncSession, tenant_id: uuid.UUID, category: str | None = None
) -> list[NewsItemResponse]:
    items = await repo.list_news_items(db, tenant_id, category)
    return [_news_item_to_response(item) for item in items]


# ── Dashboard ───────────────────────────────────────────────────────

async def get_dashboard_summary(
    db: AsyncSession, tenant_id: uuid.UUID
) -> DashboardSummaryResponse:
    status_counts = await repo.count_opportunities_by_status(db, tenant_id)
    total = sum(status_counts.values())

    mandate_summaries = await repo.get_mandate_allocation_summaries(db, tenant_id)

    recent_news_items = await repo.list_news_items(db, tenant_id, limit=5)

    return DashboardSummaryResponse(
        pipelineCounts=[
            PipelineStatusCount(status=s, count=c) for s, c in status_counts.items()
        ],
        totalOpportunities=total,
        mandateAllocations=[
            MandateAllocationSummary(
                mandateId=m["mandate_id"],
                mandateName=m["mandate_name"],
                targetAllocation=m["target_allocation"],
                currentAllocation=m["current_allocation"],
                opportunityCount=m["opportunity_count"],
            )
            for m in mandate_summaries
        ],
        recentNews=[_news_item_to_response(n) for n in recent_news_items],
    )
```

- [ ] **Step 6: Add router endpoints**

Add to `server/app/modules/deals/router.py`:

```python
from app.modules.deals.schemas import (
    AssetManagerCreate, AssetManagerResponse, AssetManagerUpdate,
    DashboardSummaryResponse, NewsItemResponse,
)

# ── Asset Managers ──────────────────────────────────────────────────

@router.get("/asset-managers", response_model=SuccessResponse[list[AssetManagerResponse]])
async def list_asset_managers(
    type: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_asset_managers(db, user.tenant_id, type)
    return SuccessResponse(data=data)


@router.post("/asset-managers", response_model=SuccessResponse[AssetManagerResponse], status_code=201)
async def create_asset_manager(
    body: AssetManagerCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_asset_manager(db, user.tenant_id, body)
    return SuccessResponse(data=data)


@router.get("/asset-managers/{am_id}", response_model=SuccessResponse[AssetManagerResponse])
async def get_asset_manager(
    am_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_asset_manager(db, user.tenant_id, am_id)
    return SuccessResponse(data=data)


@router.put("/asset-managers/{am_id}", response_model=SuccessResponse[AssetManagerResponse])
async def update_asset_manager(
    am_id: uuid.UUID,
    body: AssetManagerUpdate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_asset_manager(db, user.tenant_id, am_id, body)
    return SuccessResponse(data=data)


@router.delete("/asset-managers/{am_id}", status_code=204)
async def delete_asset_manager(
    am_id: uuid.UUID,
    user: CurrentUser = DealsOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.delete_asset_manager(db, user.tenant_id, am_id)
    return Response(status_code=204)


# ── News ────────────────────────────────────────────────────────────

@router.get("/news", response_model=SuccessResponse[list[NewsItemResponse]])
async def list_news(
    category: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_news_items(db, user.tenant_id, category)
    return SuccessResponse(data=data)


# ── Dashboard ───────────────────────────────────────────────────────

@router.get("/dashboard/summary", response_model=SuccessResponse[DashboardSummaryResponse])
async def get_dashboard_summary(
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_dashboard_summary(db, user.tenant_id)
    return SuccessResponse(data=data)
```

- [ ] **Step 7: Commit**

```bash
git add server/app/modules/deals/ server/app/database/migrations/versions/
git commit -m "feat(deals): add asset manager CRUD, news, and dashboard API endpoints"
```

---

## Task 2: Backend — Seed News Data

**Files:**
- Modify: `server/scripts/seed.py`

### Steps

- [ ] **Step 1: Add news seed data**

Add after the opportunities seed data in `server/scripts/seed.py`:

```python
    from app.modules.deals.models import NewsItem, NewsOpportunityLink

    # ── News Items ───────────────────────────────────────────────

    # Get opportunity IDs for linking (use the ones created above)
    news_items_data = [
        {
            "headline": "Biotech VC Fundraising Hits Record $12B in Q1 2026",
            "summary": "Venture capital investments in biotechnology reached a record $12 billion in Q1 2026, driven by advances in gene therapy and AI-driven drug discovery. Abingworth and other specialized firms are raising larger funds to capture the opportunity.",
            "category": "sector",
            "source_url": "https://example.com/biotech-vc-2026",
        },
        {
            "headline": "Blackstone Closes Record $30B Real Estate Fund",
            "summary": "Blackstone Real Estate Partners X has reached its final close at $30.4 billion, making it the largest real estate fund ever raised. The fund will target opportunistic investments globally with a focus on logistics and data centers.",
            "category": "asset_manager",
            "source_url": "https://example.com/blackstone-re-fund",
        },
        {
            "headline": "Middle East Sovereign Wealth Funds Increase Alternative Allocations",
            "summary": "Gulf sovereign wealth funds are accelerating their shift toward alternative investments, with average allocations rising to 35% of total AUM. Real assets and infrastructure are the primary beneficiaries.",
            "category": "market",
            "source_url": "https://example.com/me-swf-alternatives",
        },
        {
            "headline": "SEC Proposes New Private Fund Disclosure Requirements",
            "summary": "The SEC has proposed enhanced disclosure requirements for private fund advisors, including quarterly statements on fees, expenses, and performance. The rule is expected to take effect in 2027.",
            "category": "regulatory",
            "source_url": "https://example.com/sec-private-fund-rules",
        },
        {
            "headline": "Global PE Deal Activity Rebounds in Q1 2026",
            "summary": "Private equity deal volume increased 23% year-over-year in Q1 2026, led by technology and healthcare sectors. Dry powder levels remain elevated at $2.5 trillion globally.",
            "category": "market",
            "source_url": "https://example.com/pe-deal-activity-q1",
        },
    ]

    for item_data in news_items_data:
        news_item = NewsItem(
            tenant_id=org_id,
            headline=item_data["headline"],
            summary=item_data["summary"],
            category=item_data["category"],
            source_url=item_data["source_url"],
        )
        db_session.add(news_item)
    await db_session.flush()

    print("News seed data created successfully")
```

- [ ] **Step 2: Run seed script**

```bash
cd server
python scripts/seed.py
```

- [ ] **Step 3: Commit**

```bash
git add server/scripts/seed.py
git commit -m "feat(deals): add news seed data"
```

---

## Task 3: Frontend — Types, API, Store Updates

**Files:**
- Modify: `client/src/modules/deals/types.ts`
- Modify: `client/src/modules/deals/api.ts`
- Modify: `client/src/modules/deals/store.ts`

### Steps

- [ ] **Step 1: Add AssetManager, NewsItem, and Dashboard types**

Add to `client/src/modules/deals/types.ts`:

```typescript
// ── Asset Managers ──────────────────────────────────────────────────

export interface AssetManager {
  id: string
  name: string
  type: string | null
  location: string | null
  description: string | null
  fundInfo: Record<string, string>
  firmInfo: Record<string, string>
  strategy: Record<string, string>
  characteristics: Record<string, string>
  createdByType: 'system' | 'manual'
  createdAt: string
  updatedAt: string
}

// ── News ────────────────────────────────────────────────────────────

export type NewsCategory = 'market' | 'sector' | 'asset_manager' | 'regulatory'

export interface NewsItem {
  id: string
  headline: string
  summary: string | null
  fullContent: string | null
  category: NewsCategory | null
  sourceUrl: string | null
  linkedOpportunityIds: string[]
  generatedAt: string
  createdAt: string
}

// ── Dashboard ───────────────────────────────────────────────────────

export interface PipelineStatusCount {
  status: PipelineStatus
  count: number
}

export interface MandateAllocationSummary {
  mandateId: string
  mandateName: string
  targetAllocation: number | null
  currentAllocation: number
  opportunityCount: number
}

export interface DashboardSummary {
  pipelineCounts: PipelineStatusCount[]
  totalOpportunities: number
  mandateAllocations: MandateAllocationSummary[]
  recentNews: NewsItem[]
}
```

- [ ] **Step 2: Add API functions**

Add to `client/src/modules/deals/api.ts`:

```typescript
import type { AssetManager, NewsItem, DashboardSummary, NewsCategory } from './types'

// Asset Managers
listAssetManagers: (type?: string) => {
  const params = type ? `?type=${type}` : ''
  return api.get<AssetManager[]>(`/deals/asset-managers${params}`)
},
getAssetManager: (id: string) => api.get<AssetManager>(`/deals/asset-managers/${id}`),
createAssetManager: (data: Partial<AssetManager>) =>
  api.post<AssetManager>('/deals/asset-managers', data),
updateAssetManager: (id: string, data: Partial<AssetManager>) =>
  api.put<AssetManager>(`/deals/asset-managers/${id}`, data),
deleteAssetManager: (id: string) => api.delete<void>(`/deals/asset-managers/${id}`),

// News
listNews: (category?: NewsCategory) => {
  const params = category ? `?category=${category}` : ''
  return api.get<NewsItem[]>(`/deals/news${params}`)
},

// Dashboard
getDashboardSummary: () => api.get<DashboardSummary>('/deals/dashboard/summary'),
```

- [ ] **Step 3: Add store state and actions**

Add to the `DealsState` interface and store implementation in `client/src/modules/deals/store.ts`:

```typescript
// Add to interface:
assetManagers: AssetManager[]
loadingAssetManagers: boolean
newsItems: NewsItem[]
loadingNews: boolean
dashboardSummary: DashboardSummary | null
loadingDashboard: boolean

fetchAssetManagers: (type?: string) => Promise<void>
fetchNews: (category?: NewsCategory) => Promise<void>
fetchDashboardSummary: () => Promise<void>

// Add to create():
assetManagers: [],
loadingAssetManagers: false,
newsItems: [],
loadingNews: false,
dashboardSummary: null,
loadingDashboard: false,

fetchAssetManagers: async (type?: string) => {
  set({ loadingAssetManagers: true })
  try {
    const assetManagers = await dealsApi.listAssetManagers(type)
    set({ assetManagers })
  } finally {
    set({ loadingAssetManagers: false })
  }
},

fetchNews: async (category?: NewsCategory) => {
  set({ loadingNews: true })
  try {
    const newsItems = await dealsApi.listNews(category)
    set({ newsItems })
  } finally {
    set({ loadingNews: false })
  }
},

fetchDashboardSummary: async () => {
  set({ loadingDashboard: true })
  try {
    const dashboardSummary = await dealsApi.getDashboardSummary()
    set({ dashboardSummary })
  } finally {
    set({ loadingDashboard: false })
  }
},
```

- [ ] **Step 4: Commit**

```bash
git add client/src/modules/deals/types.ts client/src/modules/deals/api.ts client/src/modules/deals/store.ts
git commit -m "feat(deals): add asset manager, news, and dashboard types/API/store"
```

---

## Task 4: Frontend — Asset Manager Pages

**Files:**
- Create: `client/src/modules/deals/components/asset-managers/AssetManagerTable.tsx`
- Create: `client/src/modules/deals/components/asset-managers/AssetManagerProfile.tsx`
- Create: `client/src/modules/deals/components/asset-managers/AssetManagerForm.tsx`
- Create: `client/src/modules/deals/components/asset-managers/LinkedOpportunities.tsx`
- Create: `client/src/modules/deals/pages/AssetManagerListPage.tsx`
- Create: `client/src/modules/deals/pages/AssetManagerDetailPage.tsx`
- Modify: `client/src/App.tsx`

### Steps

- [ ] **Step 1: Create AssetManagerTable**

Create `client/src/modules/deals/components/asset-managers/AssetManagerTable.tsx`:

Table component showing asset managers with columns: Name, Type, Location, Firm AUM (from firmInfo.firm_aum), Total Opportunities (placeholder — we'll add count later), Last Modified. Rows are clickable, navigating to `/home/deals/asset-managers/${am.id}`. Empty state for no managers.

Props: `{ assetManagers: AssetManager[] }`

Pattern: Follow `OpportunityTable.tsx` — plain `<table>` with Tailwind classes, `useNavigate` for row clicks.

- [ ] **Step 2: Create AssetManagerForm**

Create `client/src/modules/deals/components/asset-managers/AssetManagerForm.tsx`:

Dialog for creating a new asset manager. Fields: Name (required), Type (select: Venture Capital, Private Equity, Real Estate, Hedge Fund, Infrastructure, Credit, Other), Location (text). Calls `dealsApi.createAssetManager`, then navigates to detail page.

Pattern: Follow `MandateForm.tsx` — Dialog with inputs, submit handler.

- [ ] **Step 3: Create AssetManagerProfile**

Create `client/src/modules/deals/components/asset-managers/AssetManagerProfile.tsx`:

Full profile view with sections matching the spec screenshots:

- **Basic Information**: Name, Type, Location, Description (textarea, editable)
- **Fund Information**: Fund Size, Vintage Year, Fund Raised Till Date, Fund Closing Timeline (all from `fundInfo` JSONB, editable key-value pairs)
- **Firm Information**: Firm AUM, Years in Business, Number of Previous Funds, Investment Team Size (from `firmInfo` JSONB)
- **Strategy & Positioning**: Fund Strategy, USP & Differentiator, Key Person Risk (from `strategy` JSONB)
- **Metadata**: Created Date, Created By (System/Manual), Last Modified

Each section uses a `Card` component. Fields use inline editing (click to edit, blur to save). Save button calls `dealsApi.updateAssetManager`.

Props: `{ assetManager: AssetManager, onUpdate: (am: AssetManager) => void }`

- [ ] **Step 4: Create LinkedOpportunities**

Create `client/src/modules/deals/components/asset-managers/LinkedOpportunities.tsx`:

List of opportunities linked to this asset manager. Fetches from `dealsApi.listOpportunities()` filtered by the asset manager (client-side filter since backend doesn't have an asset_manager_id filter yet — or add it). Shows opportunity name, status badge, investment type, date. Clickable rows linking to the opportunity.

Props: `{ assetManagerId: string }`

- [ ] **Step 5: Create AssetManagerListPage**

Create `client/src/modules/deals/pages/AssetManagerListPage.tsx`:

- Heading "Asset Managers" with "Add Asset Manager" button
- Search by name (client-side filter)
- Filter by type (dropdown)
- Renders AssetManagerTable
- Loading state, empty state

Uses `useDealsStore` for `assetManagers`, `fetchAssetManagers`.

- [ ] **Step 6: Create AssetManagerDetailPage**

Create `client/src/modules/deals/pages/AssetManagerDetailPage.tsx`:

- Fetches asset manager by ID from URL params (`useParams`)
- Shows name as heading with type badge
- Two sections: AssetManagerProfile + LinkedOpportunities
- Loading state

- [ ] **Step 7: Add routes to App.tsx**

```tsx
import { AssetManagerListPage } from '@/modules/deals/pages/AssetManagerListPage'
import { AssetManagerDetailPage } from '@/modules/deals/pages/AssetManagerDetailPage'

// Inside deals routes:
<Route path="asset-managers" element={<AssetManagerListPage />} />
<Route path="asset-managers/:assetManagerId" element={<AssetManagerDetailPage />} />
```

- [ ] **Step 8: Commit**

```bash
git add client/src/modules/deals/pages/AssetManagerListPage.tsx client/src/modules/deals/pages/AssetManagerDetailPage.tsx client/src/modules/deals/components/asset-managers/ client/src/App.tsx
git commit -m "feat(deals): add asset manager list and detail pages"
```

---

## Task 5: Frontend — News Page

**Files:**
- Create: `client/src/modules/deals/components/news/NewsCard.tsx`
- Create: `client/src/modules/deals/components/news/NewsFeed.tsx`
- Create: `client/src/modules/deals/components/news/DailyReportButton.tsx`
- Create: `client/src/modules/deals/pages/NewsPage.tsx`
- Modify: `client/src/App.tsx`

### Steps

- [ ] **Step 1: Create NewsCard**

Create `client/src/modules/deals/components/news/NewsCard.tsx`:

Card showing a single news item: headline (bold), summary text, category badge (Market=blue, Sector=emerald, Asset Manager=amber, Regulatory=violet), timestamp (relative — "2 hours ago"), source link (if sourceUrl present).

Props: `{ item: NewsItem }`

- [ ] **Step 2: Create NewsFeed**

Create `client/src/modules/deals/components/news/NewsFeed.tsx`:

Chronological list of NewsCard components. Empty state: "No news available. News will be generated based on active opportunities."

Props: `{ items: NewsItem[] }`

- [ ] **Step 3: Create DailyReportButton**

Create `client/src/modules/deals/components/news/DailyReportButton.tsx`:

Button that would trigger daily report generation. For Phase 2A, show as disabled with tooltip "Coming soon — requires AI service integration". Renders as a Button with Download icon.

- [ ] **Step 4: Create NewsPage**

Create `client/src/modules/deals/pages/NewsPage.tsx`:

- Heading "News" with DailyReportButton
- Category filter tabs: All, Market, Sector, Asset Manager, Regulatory
- Renders NewsFeed with filtered items
- Uses `useDealsStore` for `newsItems`, `fetchNews`
- Loading state

- [ ] **Step 5: Add route to App.tsx**

```tsx
import { NewsPage } from '@/modules/deals/pages/NewsPage'

// Inside deals routes:
<Route path="news" element={<NewsPage />} />
```

- [ ] **Step 6: Commit**

```bash
git add client/src/modules/deals/pages/NewsPage.tsx client/src/modules/deals/components/news/ client/src/App.tsx
git commit -m "feat(deals): add news page with category filters and news feed"
```

---

## Task 6: Frontend — Dashboard

**Files:**
- Create: `client/src/modules/deals/components/dashboard/PipelineSummary.tsx`
- Create: `client/src/modules/deals/components/dashboard/AllocationOverview.tsx`
- Create: `client/src/modules/deals/components/dashboard/RecentNews.tsx`
- Create: `client/src/modules/deals/components/dashboard/PipelineFunnel.tsx`
- Modify: `client/src/modules/deals/pages/DashboardPage.tsx`

### Steps

- [ ] **Step 1: Create PipelineSummary**

Create `client/src/modules/deals/components/dashboard/PipelineSummary.tsx`:

Row of 4 metric cards showing opportunity count per pipeline status:
- New (blue icon) — count + "new opportunities"
- Active (emerald icon) — count + "in progress"
- Archived (slate icon) — count + "archived"
- Ignored (red icon) — count + "passed"

Each card clickable — navigates to `/home/deals/opportunities?status=<status>`.

Uses `Card` component. Total opportunity count shown as a header metric above the cards.

Props: `{ pipelineCounts: PipelineStatusCount[], totalOpportunities: number }`

- [ ] **Step 2: Create AllocationOverview**

Create `client/src/modules/deals/components/dashboard/AllocationOverview.tsx`:

Per active mandate: name, target allocation ($XM), current allocation (progress bar with %), opportunity count. Clickable — navigates to mandate detail.

Uses `Card` with progress bar (CSS `<div>` with width percentage).

Props: `{ mandateAllocations: MandateAllocationSummary[] }`

- [ ] **Step 3: Create RecentNews**

Create `client/src/modules/deals/components/dashboard/RecentNews.tsx`:

Top 5 news items as compact list: headline (truncated), category badge, timestamp. "View all" link to `/home/deals/news`.

Props: `{ newsItems: NewsItem[] }`

- [ ] **Step 4: Create PipelineFunnel**

Create `client/src/modules/deals/components/dashboard/PipelineFunnel.tsx`:

Horizontal bar chart using **Recharts** showing pipeline stages as a funnel. Bars for: New → Active → Archived (as completed). Uses `BarChart` from Recharts with custom colors per status.

Props: `{ pipelineCounts: PipelineStatusCount[] }`

Recharts is already a dependency (check `client/package.json`).

- [ ] **Step 5: Replace DashboardPage placeholder**

Replace `client/src/modules/deals/pages/DashboardPage.tsx` with the full dashboard:

```typescript
import { useEffect } from 'react'
import { useDealsStore } from '../store'
import { PipelineSummary } from '../components/dashboard/PipelineSummary'
import { AllocationOverview } from '../components/dashboard/AllocationOverview'
import { RecentNews } from '../components/dashboard/RecentNews'
import { PipelineFunnel } from '../components/dashboard/PipelineFunnel'

export function DealsDashboardPage() {
  const { dashboardSummary, loadingDashboard, fetchDashboardSummary } = useDealsStore()

  useEffect(() => {
    fetchDashboardSummary()
  }, [fetchDashboardSummary])

  if (loadingDashboard || !dashboardSummary) {
    return <div className="text-muted-foreground">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Deals Dashboard</h1>

      <PipelineSummary
        pipelineCounts={dashboardSummary.pipelineCounts}
        totalOpportunities={dashboardSummary.totalOpportunities}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationOverview mandateAllocations={dashboardSummary.mandateAllocations} />
        <PipelineFunnel pipelineCounts={dashboardSummary.pipelineCounts} />
      </div>

      <RecentNews newsItems={dashboardSummary.recentNews} />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/modules/deals/pages/DashboardPage.tsx client/src/modules/deals/components/dashboard/
git commit -m "feat(deals): add dashboard with pipeline summary, allocations, funnel, and news"
```

---

## Phase 2A Complete

After these 6 tasks, all 7 Deals sidebar pages have real UI:

| Page | Phase | Status |
|------|-------|--------|
| Dashboard | 2A | Pipeline summary, allocation overview, funnel chart, recent news |
| Mandates | 1 | List + detail with strategy overview |
| Opportunities | 1 | Pipeline list with status tabs |
| Email Hub | 3 | Placeholder (future) |
| Asset Managers | 2A | List + detail with profile sections |
| News | 2A | Feed with category filters |
| Settings | 1 | Snapshot fields + document templates |

### Next phases:
- **Phase 2B**: Opportunity Workspace + Document Collaboration (OnlyOffice, multi-panel, validation workflow)
- **Phase 3**: Email Hub + Gmail Plugin + Google Drive Import
