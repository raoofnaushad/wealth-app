# Deals Module Phase 2B — Opportunity Workspace & Document Collaboration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the opportunity workspace (multi-panel split view with snapshot and document panels) and the document collaboration system (create documents, validation workflow with approval rationale, share with team, send via email).

**Architecture:** Backend adds Document, DocumentReview, DocumentShare, and SourceFile models with CRUD endpoints. Frontend adds the workspace page with a resizable split-panel layout, snapshot viewer, document editor (rich textarea — OnlyOffice integration deferred to infrastructure phase), and collaboration dialogs. The workspace is the core analyst experience.

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), React 19, TypeScript, Zustand, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-11-deals-module-design.md` — Sections 5 (Opportunity Workspace), Document actions, Validation workflow

**Depends on:** Phase 1 + Phase 2A complete

**OnlyOffice note:** The actual OnlyOffice Document Server integration (Docker, WOPI protocol, real-time co-editing) is deferred to a separate infrastructure phase. This plan implements the workspace UI with a rich textarea document editor that can be swapped for OnlyOffice later without architectural changes.

---

## File Map

### Backend (new/modified)

```
server/app/modules/deals/
  models.py          — ADD: Document, DocumentReview, DocumentReviewItem, DocumentShare, SourceFile
  schemas.py         — ADD: Document, Review, Share schemas
  repository.py      — ADD: document, review, share CRUD queries
  service.py         — ADD: document, review, share business logic
  router.py          — ADD: /opportunities/:id/documents/*, /reviews/*, /documents/:id/share/*, /documents/send-email
```

### Frontend (new files)

```
client/src/modules/deals/
  pages/
    OpportunityWorkspacePage.tsx         — Multi-panel workspace
  components/
    workspace/
      WorkspaceLayout.tsx               — Split panel container with resizable divider
      WorkspaceTabBar.tsx               — Tab bar for snapshot + documents
      SnapshotPanel.tsx                 — Structured snapshot fields with inline editing
      DocumentPanel.tsx                 — Document editor (rich textarea for now)
      CreateDocumentDialog.tsx          — Select document type → trigger creation
      DocumentActions.tsx               — Action bar: validate, share, email, download
      ValidationDialog.tsx              — Select documents + pick reviewer
      ShareDialog.tsx                   — Select team members to share with
      SendEmailDialog.tsx               — Compose email with documents as attachments
      ReviewBanner.tsx                  — Shows review status on documents in review
```

### Frontend (modified)

```
client/src/modules/deals/
  types.ts            — ADD: Document, DocumentReview, DocumentShare, SourceFile, WorkspaceTab types
  api.ts              — ADD: document, review, share API functions
  store.ts            — ADD: workspace state (activeOpportunity, documents, panelLayout)
client/src/App.tsx    — ADD: workspace route
```

---

## Task 1: Backend — Document & Collaboration Models + Migration

**Files:**
- Modify: `server/app/modules/deals/models.py`

### Steps

- [ ] **Step 1: Add Document, DocumentReview, DocumentReviewItem, DocumentShare, and SourceFile models**

Add to `server/app/modules/deals/models.py`:

```python
class SourceFile(Base, TenantMixin, TimestampMixin):
    """Source files (email attachments, uploads) linked to opportunities."""

    __tablename__ = "source_files"
    __table_args__ = (
        Index("ix_source_files_opportunity", "opportunity_id"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.opportunities.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vector_store_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    processed: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    source_origin: Mapped[str | None] = mapped_column(String(20), nullable=True)


class Document(Base, TenantMixin, TimestampMixin):
    """Workspace documents (memos, DDQs, etc.)."""

    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_opportunity", "opportunity_id"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.opportunities.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.document_templates.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), server_default="draft", nullable=False)
    version: Mapped[int] = mapped_column(Integer, server_default="1", nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class DocumentReview(Base, TenantMixin):
    """Document validation/review requests."""

    __tablename__ = "document_reviews"
    __table_args__ = (
        Index("ix_document_reviews_reviewer", "reviewer_id", "status"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    requested_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default="pending", nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    rationale_generated: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["DocumentReviewItem"]] = relationship(
        back_populates="review", cascade="all, delete-orphan", lazy="selectin"
    )


class DocumentReviewItem(Base):
    """Junction: which documents are in a review request."""

    __tablename__ = "document_review_items"
    __table_args__ = (
        UniqueConstraint("review_id", "document_id", name="uq_review_items_review_doc"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.document_reviews.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.documents.id", ondelete="CASCADE"), nullable=False
    )

    review: Mapped["DocumentReview"] = relationship(back_populates="items")
    document: Mapped["Document"] = relationship()


class DocumentShare(Base, TenantMixin):
    """Document sharing with team members."""

    __tablename__ = "document_shares"
    __table_args__ = {"schema": "deals"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.documents.id", ondelete="CASCADE"), nullable=False
    )
    shared_with: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    shared_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    permission: Mapped[str] = mapped_column(String(20), server_default="comment", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
```

- [ ] **Step 2: Generate and run Alembic migration**

```bash
cd server
alembic revision --autogenerate -m "deals: add documents, reviews, shares, source_files"
alembic upgrade head
```

- [ ] **Step 3: Commit**

```bash
git add server/app/modules/deals/models.py server/app/database/migrations/versions/
git commit -m "feat(deals): add document, review, share, and source file models"
```

---

## Task 2: Backend — Document & Collaboration API

**Files:**
- Modify: `server/app/modules/deals/schemas.py`
- Modify: `server/app/modules/deals/repository.py`
- Modify: `server/app/modules/deals/service.py`
- Modify: `server/app/modules/deals/router.py`

### Steps

- [ ] **Step 1: Add Pydantic schemas**

Add to `server/app/modules/deals/schemas.py`:

```python
# ── Documents ───────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    opportunityId: str
    templateId: str | None
    name: str
    documentType: str
    content: str | None
    status: str
    version: int
    createdBy: str | None
    createdAt: datetime
    updatedAt: datetime


class DocumentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=500)
    documentType: str
    templateId: str | None = None
    content: str | None = None


class DocumentUpdate(BaseModel):
    name: str | None = None
    content: str | None = None
    status: str | None = None


# ── Document Reviews ────────────────────────────────────────────────

class ReviewDocumentItem(BaseModel):
    documentId: str
    documentName: str
    documentType: str


class DocumentReviewResponse(BaseModel):
    id: str
    reviewerId: str
    requestedBy: str
    status: str
    rationale: str | None
    rationaleGenerated: bool
    requestedAt: datetime
    reviewedAt: datetime | None
    documents: list[ReviewDocumentItem]


class DocumentReviewCreate(BaseModel):
    reviewerId: str
    documentIds: list[str]


class DocumentReviewUpdate(BaseModel):
    status: str  # 'approved', 'changes_requested'
    rationale: str | None = None


# ── Document Shares ─────────────────────────────────────────────────

class DocumentShareResponse(BaseModel):
    id: str
    documentId: str
    sharedWith: str
    sharedBy: str
    permission: str
    createdAt: datetime


class DocumentShareCreate(BaseModel):
    sharedWith: list[str]
    permission: str = "comment"


# ── Source Files ────────────────────────────────────────────────────

class SourceFileResponse(BaseModel):
    id: str
    opportunityId: str
    fileName: str
    fileUrl: str
    fileType: str | None
    fileSize: int | None
    processed: bool
    sourceOrigin: str | None
    createdAt: datetime
```

- [ ] **Step 2: Add repository functions**

Add to `server/app/modules/deals/repository.py`:

```python
from app.modules.deals.models import Document, DocumentReview, DocumentReviewItem, DocumentShare, SourceFile

# ── Documents ───────────────────────────────────────────────────────

async def list_documents(db: AsyncSession, tenant_id: uuid.UUID, opportunity_id: uuid.UUID) -> list[Document]:
    result = await db.execute(
        select(Document).where(
            Document.tenant_id == tenant_id,
            Document.opportunity_id == opportunity_id,
        ).order_by(Document.created_at)
    )
    return list(result.scalars().all())


async def get_document(db: AsyncSession, tenant_id: uuid.UUID, doc_id: uuid.UUID) -> Document | None:
    result = await db.execute(
        select(Document).where(Document.tenant_id == tenant_id, Document.id == doc_id)
    )
    return result.scalar_one_or_none()


async def create_document(db: AsyncSession, doc: Document) -> Document:
    db.add(doc)
    await db.flush()
    return doc


async def update_document(db: AsyncSession, doc: Document, data: dict) -> Document:
    for key, value in data.items():
        if value is not None:
            setattr(doc, key, value)
    await db.flush()
    return doc


async def delete_document(db: AsyncSession, doc: Document) -> None:
    await db.delete(doc)
    await db.flush()


# ── Document Reviews ────────────────────────────────────────────────

async def list_reviews(
    db: AsyncSession, tenant_id: uuid.UUID,
    reviewer_id: uuid.UUID | None = None,
    requested_by: uuid.UUID | None = None,
    status: str | None = None,
) -> list[DocumentReview]:
    stmt = select(DocumentReview).where(DocumentReview.tenant_id == tenant_id)
    if reviewer_id:
        stmt = stmt.where(DocumentReview.reviewer_id == reviewer_id)
    if requested_by:
        stmt = stmt.where(DocumentReview.requested_by == requested_by)
    if status:
        stmt = stmt.where(DocumentReview.status == status)
    stmt = stmt.order_by(DocumentReview.requested_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_review(db: AsyncSession, tenant_id: uuid.UUID, review_id: uuid.UUID) -> DocumentReview | None:
    result = await db.execute(
        select(DocumentReview).where(DocumentReview.tenant_id == tenant_id, DocumentReview.id == review_id)
    )
    return result.scalar_one_or_none()


async def create_review(db: AsyncSession, review: DocumentReview, document_ids: list[uuid.UUID]) -> DocumentReview:
    db.add(review)
    await db.flush()
    for doc_id in document_ids:
        item = DocumentReviewItem(review_id=review.id, document_id=doc_id)
        db.add(item)
    await db.flush()
    # Refresh to load items relationship
    await db.refresh(review)
    return review


async def update_review(db: AsyncSession, review: DocumentReview, data: dict) -> DocumentReview:
    for key, value in data.items():
        if value is not None:
            setattr(review, key, value)
    await db.flush()
    return review


# ── Document Shares ─────────────────────────────────────────────────

async def list_shares(db: AsyncSession, tenant_id: uuid.UUID, document_id: uuid.UUID) -> list[DocumentShare]:
    result = await db.execute(
        select(DocumentShare).where(
            DocumentShare.tenant_id == tenant_id,
            DocumentShare.document_id == document_id,
        )
    )
    return list(result.scalars().all())


async def create_share(db: AsyncSession, share: DocumentShare) -> DocumentShare:
    db.add(share)
    await db.flush()
    return share


async def delete_share(db: AsyncSession, share: DocumentShare) -> None:
    await db.delete(share)
    await db.flush()


async def get_share(db: AsyncSession, tenant_id: uuid.UUID, share_id: uuid.UUID) -> DocumentShare | None:
    result = await db.execute(
        select(DocumentShare).where(DocumentShare.tenant_id == tenant_id, DocumentShare.id == share_id)
    )
    return result.scalar_one_or_none()


# ── Source Files ────────────────────────────────────────────────────

async def list_source_files(db: AsyncSession, tenant_id: uuid.UUID, opportunity_id: uuid.UUID) -> list[SourceFile]:
    result = await db.execute(
        select(SourceFile).where(
            SourceFile.tenant_id == tenant_id,
            SourceFile.opportunity_id == opportunity_id,
        ).order_by(SourceFile.created_at)
    )
    return list(result.scalars().all())
```

- [ ] **Step 3: Add service functions**

Add to `server/app/modules/deals/service.py`:

```python
from app.modules.deals.models import Document, DocumentReview, DocumentShare, SourceFile
from app.modules.deals.schemas import (
    DocumentCreate, DocumentResponse, DocumentUpdate,
    DocumentReviewCreate, DocumentReviewResponse, DocumentReviewUpdate,
    DocumentShareCreate, DocumentShareResponse,
    ReviewDocumentItem, SourceFileResponse,
)
from datetime import datetime, timezone


def _document_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=str(doc.id),
        opportunityId=str(doc.opportunity_id),
        templateId=str(doc.template_id) if doc.template_id else None,
        name=doc.name,
        documentType=doc.document_type,
        content=doc.content,
        status=doc.status,
        version=doc.version,
        createdBy=str(doc.created_by) if doc.created_by else None,
        createdAt=doc.created_at,
        updatedAt=doc.updated_at,
    )


def _review_to_response(review: DocumentReview) -> DocumentReviewResponse:
    return DocumentReviewResponse(
        id=str(review.id),
        reviewerId=str(review.reviewer_id),
        requestedBy=str(review.requested_by),
        status=review.status,
        rationale=review.rationale,
        rationaleGenerated=review.rationale_generated,
        requestedAt=review.requested_at,
        reviewedAt=review.reviewed_at,
        documents=[
            ReviewDocumentItem(
                documentId=str(item.document_id),
                documentName=item.document.name if item.document else "",
                documentType=item.document.document_type if item.document else "",
            )
            for item in review.items
        ],
    )


def _share_to_response(share: DocumentShare) -> DocumentShareResponse:
    return DocumentShareResponse(
        id=str(share.id),
        documentId=str(share.document_id),
        sharedWith=str(share.shared_with),
        sharedBy=str(share.shared_by),
        permission=share.permission,
        createdAt=share.created_at,
    )


def _source_file_to_response(sf: SourceFile) -> SourceFileResponse:
    return SourceFileResponse(
        id=str(sf.id),
        opportunityId=str(sf.opportunity_id),
        fileName=sf.file_name,
        fileUrl=sf.file_url,
        fileType=sf.file_type,
        fileSize=sf.file_size,
        processed=sf.processed,
        sourceOrigin=sf.source_origin,
        createdAt=sf.created_at,
    )


# ── Documents ───────────────────────────────────────────────────────

async def list_documents(db, tenant_id, opportunity_id):
    docs = await repo.list_documents(db, tenant_id, opportunity_id)
    return [_document_to_response(d) for d in docs]


async def get_document(db, tenant_id, doc_id):
    doc = await repo.get_document(db, tenant_id, doc_id)
    if not doc:
        raise not_found("Document not found")
    return _document_to_response(doc)


async def create_document(db, tenant_id, opportunity_id, user_id, data: DocumentCreate):
    doc = Document(
        tenant_id=tenant_id,
        opportunity_id=opportunity_id,
        template_id=uuid.UUID(data.templateId) if data.templateId else None,
        name=data.name,
        document_type=data.documentType,
        content=data.content or "",
        created_by=user_id,
    )
    created = await repo.create_document(db, doc)
    return _document_to_response(created)


async def update_document(db, tenant_id, doc_id, data: DocumentUpdate):
    doc = await repo.get_document(db, tenant_id, doc_id)
    if not doc:
        raise not_found("Document not found")
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.content is not None:
        update_data["content"] = data.content
    if data.status is not None:
        update_data["status"] = data.status
    updated = await repo.update_document(db, doc, update_data)
    return _document_to_response(updated)


async def delete_document(db, tenant_id, doc_id):
    doc = await repo.get_document(db, tenant_id, doc_id)
    if not doc:
        raise not_found("Document not found")
    await repo.delete_document(db, doc)


# ── Document Reviews ────────────────────────────────────────────────

async def list_reviews(db, tenant_id, reviewer_id=None, requested_by=None, status=None):
    reviews = await repo.list_reviews(db, tenant_id, reviewer_id, requested_by, status)
    return [_review_to_response(r) for r in reviews]


async def get_review(db, tenant_id, review_id):
    review = await repo.get_review(db, tenant_id, review_id)
    if not review:
        raise not_found("Review not found")
    return _review_to_response(review)


async def create_review(db, tenant_id, user_id, data: DocumentReviewCreate):
    review = DocumentReview(
        tenant_id=tenant_id,
        reviewer_id=uuid.UUID(data.reviewerId),
        requested_by=user_id,
    )
    doc_ids = [uuid.UUID(d) for d in data.documentIds]
    # Update document statuses to in_review
    for doc_id in doc_ids:
        doc = await repo.get_document(db, tenant_id, doc_id)
        if doc:
            await repo.update_document(db, doc, {"status": "in_review"})
    created = await repo.create_review(db, review, doc_ids)
    return _review_to_response(created)


async def update_review(db, tenant_id, review_id, data: DocumentReviewUpdate):
    review = await repo.get_review(db, tenant_id, review_id)
    if not review:
        raise not_found("Review not found")
    update_data = {"status": data.status}
    if data.rationale is not None:
        update_data["rationale"] = data.rationale
    if data.status in ("approved", "changes_requested"):
        update_data["reviewed_at"] = datetime.now(timezone.utc)
    updated = await repo.update_review(db, review, update_data)
    # If approved, update document statuses
    if data.status == "approved":
        for item in updated.items:
            doc = await repo.get_document(db, tenant_id, item.document_id)
            if doc:
                await repo.update_document(db, doc, {"status": "approved"})
    return _review_to_response(updated)


# ── Document Shares ─────────────────────────────────────────────────

async def list_shares(db, tenant_id, document_id):
    shares = await repo.list_shares(db, tenant_id, document_id)
    return [_share_to_response(s) for s in shares]


async def create_shares(db, tenant_id, document_id, user_id, data: DocumentShareCreate):
    results = []
    for user_uuid_str in data.sharedWith:
        share = DocumentShare(
            tenant_id=tenant_id,
            document_id=document_id,
            shared_with=uuid.UUID(user_uuid_str),
            shared_by=user_id,
            permission=data.permission,
        )
        created = await repo.create_share(db, share)
        results.append(_share_to_response(created))
    return results


async def delete_share(db, tenant_id, share_id):
    share = await repo.get_share(db, tenant_id, share_id)
    if not share:
        raise not_found("Share not found")
    await repo.delete_share(db, share)


# ── Source Files ────────────────────────────────────────────────────

async def list_source_files(db, tenant_id, opportunity_id):
    files = await repo.list_source_files(db, tenant_id, opportunity_id)
    return [_source_file_to_response(f) for f in files]
```

- [ ] **Step 4: Add router endpoints**

Add to `server/app/modules/deals/router.py`:

```python
from app.modules.deals.schemas import (
    DocumentCreate, DocumentResponse, DocumentUpdate,
    DocumentReviewCreate, DocumentReviewResponse, DocumentReviewUpdate,
    DocumentShareCreate, DocumentShareResponse,
    SourceFileResponse,
)

# Use existing DealsRead and DealsOwner dependencies
# Add DealsManager for review approval:
DealsManager = Depends(require_role("deals", ["owner", "manager"]))

# ── Documents ───────────────────────────────────────────────────────

@router.get("/opportunities/{opp_id}/documents", response_model=SuccessResponse[list[DocumentResponse]])
async def list_documents(opp_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.list_documents(db, user.tenant_id, opp_id)
    return SuccessResponse(data=data)

@router.post("/opportunities/{opp_id}/documents", response_model=SuccessResponse[DocumentResponse], status_code=201)
async def create_document(opp_id: uuid.UUID, body: DocumentCreate, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.create_document(db, user.tenant_id, opp_id, user.id, body)
    return SuccessResponse(data=data)

@router.get("/opportunities/{opp_id}/documents/{doc_id}", response_model=SuccessResponse[DocumentResponse])
async def get_document(opp_id: uuid.UUID, doc_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.get_document(db, user.tenant_id, doc_id)
    return SuccessResponse(data=data)

@router.put("/opportunities/{opp_id}/documents/{doc_id}", response_model=SuccessResponse[DocumentResponse])
async def update_document(opp_id: uuid.UUID, doc_id: uuid.UUID, body: DocumentUpdate, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.update_document(db, user.tenant_id, doc_id, body)
    return SuccessResponse(data=data)

@router.delete("/opportunities/{opp_id}/documents/{doc_id}", status_code=204)
async def delete_document(opp_id: uuid.UUID, doc_id: uuid.UUID, user: CurrentUser = DealsOwner, db: AsyncSession = Depends(get_db_with_tenant)):
    await service.delete_document(db, user.tenant_id, doc_id)
    return Response(status_code=204)

# ── Source Files ────────────────────────────────────────────────────

@router.get("/opportunities/{opp_id}/files", response_model=SuccessResponse[list[SourceFileResponse]])
async def list_source_files(opp_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.list_source_files(db, user.tenant_id, opp_id)
    return SuccessResponse(data=data)

# ── Document Reviews ────────────────────────────────────────────────

@router.post("/reviews", response_model=SuccessResponse[DocumentReviewResponse], status_code=201)
async def create_review(body: DocumentReviewCreate, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.create_review(db, user.tenant_id, user.id, body)
    return SuccessResponse(data=data)

@router.get("/reviews", response_model=SuccessResponse[list[DocumentReviewResponse]])
async def list_reviews(
    reviewer_id: uuid.UUID | None = Query(None, alias="reviewerId"),
    requested_by: uuid.UUID | None = Query(None, alias="requestedBy"),
    status: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_reviews(db, user.tenant_id, reviewer_id, requested_by, status)
    return SuccessResponse(data=data)

@router.get("/reviews/{review_id}", response_model=SuccessResponse[DocumentReviewResponse])
async def get_review(review_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.get_review(db, user.tenant_id, review_id)
    return SuccessResponse(data=data)

@router.put("/reviews/{review_id}", response_model=SuccessResponse[DocumentReviewResponse])
async def update_review(review_id: uuid.UUID, body: DocumentReviewUpdate, user: CurrentUser = DealsManager, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.update_review(db, user.tenant_id, review_id, body)
    return SuccessResponse(data=data)

# ── Document Sharing ────────────────────────────────────────────────

@router.post("/documents/{doc_id}/share", response_model=SuccessResponse[list[DocumentShareResponse]], status_code=201)
async def share_document(doc_id: uuid.UUID, body: DocumentShareCreate, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.create_shares(db, user.tenant_id, doc_id, user.id, body)
    return SuccessResponse(data=data)

@router.get("/documents/{doc_id}/shares", response_model=SuccessResponse[list[DocumentShareResponse]])
async def list_shares(doc_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.list_shares(db, user.tenant_id, doc_id)
    return SuccessResponse(data=data)

@router.delete("/documents/{doc_id}/shares/{share_id}", status_code=204)
async def delete_share(doc_id: uuid.UUID, share_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    await service.delete_share(db, user.tenant_id, share_id)
    return Response(status_code=204)
```

- [ ] **Step 5: Commit**

```bash
git add server/app/modules/deals/
git commit -m "feat(deals): add document CRUD, review workflow, and sharing API endpoints"
```

---

## Task 3: Frontend — Workspace Types, API, Store

**Files:**
- Modify: `client/src/modules/deals/types.ts`
- Modify: `client/src/modules/deals/api.ts`
- Modify: `client/src/modules/deals/store.ts`

### Steps

- [ ] **Step 1: Add types**

Add to `client/src/modules/deals/types.ts`:

```typescript
// ── Documents ───────────────────────────────────────────────────────

export type DocumentType = 'investment_memo' | 'pre_screening' | 'ddq' | 'news' | 'market_analysis' | 'custom'
export type DocumentStatus = 'draft' | 'in_review' | 'approved'

export interface Document {
  id: string
  opportunityId: string
  templateId: string | null
  name: string
  documentType: DocumentType
  content: string | null
  status: DocumentStatus
  version: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

// ── Document Reviews ────────────────────────────────────────────────

export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'changes_requested'

export interface ReviewDocumentItem {
  documentId: string
  documentName: string
  documentType: string
}

export interface DocumentReview {
  id: string
  reviewerId: string
  requestedBy: string
  status: ReviewStatus
  rationale: string | null
  rationaleGenerated: boolean
  requestedAt: string
  reviewedAt: string | null
  documents: ReviewDocumentItem[]
}

// ── Document Shares ─────────────────────────────────────────────────

export interface DocumentShare {
  id: string
  documentId: string
  sharedWith: string
  sharedBy: string
  permission: 'comment' | 'view'
  createdAt: string
}

// ── Source Files ────────────────────────────────────────────────────

export interface SourceFile {
  id: string
  opportunityId: string
  fileName: string
  fileUrl: string
  fileType: string | null
  fileSize: number | null
  processed: boolean
  sourceOrigin: string | null
  createdAt: string
}

// ── Workspace ───────────────────────────────────────────────────────

export type WorkspaceTabType = 'snapshot' | 'document'

export interface WorkspaceTab {
  id: string
  type: WorkspaceTabType
  label: string
  documentId?: string
}

export type PanelPosition = 'left' | 'right'
```

- [ ] **Step 2: Add API functions**

Add to `client/src/modules/deals/api.ts`:

```typescript
import type { Document, DocumentReview, DocumentShare, SourceFile } from './types'

  // Documents
  listDocuments: (opportunityId: string) =>
    api.get<Document[]>(`/deals/opportunities/${opportunityId}/documents`),
  getDocument: (opportunityId: string, docId: string) =>
    api.get<Document>(`/deals/opportunities/${opportunityId}/documents/${docId}`),
  createDocument: (opportunityId: string, data: { name: string; documentType: string; templateId?: string; content?: string }) =>
    api.post<Document>(`/deals/opportunities/${opportunityId}/documents`, data),
  updateDocument: (opportunityId: string, docId: string, data: { name?: string; content?: string; status?: string }) =>
    api.put<Document>(`/deals/opportunities/${opportunityId}/documents/${docId}`, data),
  deleteDocument: (opportunityId: string, docId: string) =>
    api.delete<void>(`/deals/opportunities/${opportunityId}/documents/${docId}`),

  // Source Files
  listSourceFiles: (opportunityId: string) =>
    api.get<SourceFile[]>(`/deals/opportunities/${opportunityId}/files`),

  // Reviews
  listReviews: (filters?: { reviewerId?: string; requestedBy?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (filters?.reviewerId) params.set('reviewerId', filters.reviewerId)
    if (filters?.requestedBy) params.set('requestedBy', filters.requestedBy)
    if (filters?.status) params.set('status', filters.status)
    const qs = params.toString()
    return api.get<DocumentReview[]>(`/deals/reviews${qs ? `?${qs}` : ''}`)
  },
  getReview: (reviewId: string) => api.get<DocumentReview>(`/deals/reviews/${reviewId}`),
  createReview: (data: { reviewerId: string; documentIds: string[] }) =>
    api.post<DocumentReview>('/deals/reviews', data),
  updateReview: (reviewId: string, data: { status: string; rationale?: string }) =>
    api.put<DocumentReview>(`/deals/reviews/${reviewId}`, data),

  // Shares
  listShares: (docId: string) => api.get<DocumentShare[]>(`/deals/documents/${docId}/shares`),
  shareDocument: (docId: string, data: { sharedWith: string[]; permission?: string }) =>
    api.post<DocumentShare[]>(`/deals/documents/${docId}/share`, data),
  removeShare: (docId: string, shareId: string) =>
    api.delete<void>(`/deals/documents/${docId}/shares/${shareId}`),
```

- [ ] **Step 3: Add workspace state to store**

Add to `client/src/modules/deals/store.ts`:

```typescript
import type { Document, WorkspaceTab, SourceFile } from './types'

// Add to interface:
  // Workspace
  activeOpportunity: Opportunity | null
  workspaceDocuments: Document[]
  workspaceTabs: WorkspaceTab[]
  leftPanelTabId: string | null
  rightPanelTabId: string | null
  loadingWorkspace: boolean

  fetchWorkspace: (opportunityId: string) => Promise<void>
  addWorkspaceDocument: (doc: Document) => void
  setLeftPanel: (tabId: string) => void
  setRightPanel: (tabId: string) => void

// Add to create():
  activeOpportunity: null,
  workspaceDocuments: [],
  workspaceTabs: [],
  leftPanelTabId: null,
  rightPanelTabId: null,
  loadingWorkspace: false,

  fetchWorkspace: async (opportunityId: string) => {
    set({ loadingWorkspace: true })
    try {
      const [opportunity, documents] = await Promise.all([
        dealsApi.getOpportunity(opportunityId),
        dealsApi.listDocuments(opportunityId),
      ])
      const tabs: WorkspaceTab[] = [
        { id: 'snapshot', type: 'snapshot', label: 'Snapshot' },
        ...documents.map(d => ({ id: d.id, type: 'document' as const, label: d.name, documentId: d.id })),
      ]
      set({
        activeOpportunity: opportunity,
        workspaceDocuments: documents,
        workspaceTabs: tabs,
        leftPanelTabId: 'snapshot',
        rightPanelTabId: documents[0]?.id ?? null,
      })
    } finally {
      set({ loadingWorkspace: false })
    }
  },

  addWorkspaceDocument: (doc: Document) => {
    const { workspaceDocuments, workspaceTabs } = get()
    const newTab: WorkspaceTab = { id: doc.id, type: 'document', label: doc.name, documentId: doc.id }
    set({
      workspaceDocuments: [...workspaceDocuments, doc],
      workspaceTabs: [...workspaceTabs, newTab],
      rightPanelTabId: doc.id,
    })
  },

  setLeftPanel: (tabId: string) => set({ leftPanelTabId: tabId }),
  setRightPanel: (tabId: string) => set({ rightPanelTabId: tabId }),
```

- [ ] **Step 4: Commit**

```bash
git add client/src/modules/deals/types.ts client/src/modules/deals/api.ts client/src/modules/deals/store.ts
git commit -m "feat(deals): add document, review, share types and workspace state"
```

---

## Task 4: Frontend — Workspace Layout & Panels

**Files:**
- Create: `client/src/modules/deals/components/workspace/WorkspaceLayout.tsx`
- Create: `client/src/modules/deals/components/workspace/WorkspaceTabBar.tsx`
- Create: `client/src/modules/deals/components/workspace/SnapshotPanel.tsx`
- Create: `client/src/modules/deals/components/workspace/DocumentPanel.tsx`
- Create: `client/src/modules/deals/pages/OpportunityWorkspacePage.tsx`
- Modify: `client/src/App.tsx`

### Steps

- [ ] **Step 1: Create WorkspaceTabBar**

Create `client/src/modules/deals/components/workspace/WorkspaceTabBar.tsx`:

Horizontal tab bar showing all workspace tabs (Snapshot + documents). Each tab is clickable. Active tab has a highlight. Tabs can be dragged to left or right panel (simplified: click assigns to the panel that doesn't have it). "+ New Document" button at the end triggers the create dialog.

Props: `{ tabs: WorkspaceTab[], leftTabId: string | null, rightTabId: string | null, onTabClick: (tabId: string, panel: 'left' | 'right') => void, onNewDocument: () => void }`

- [ ] **Step 2: Create SnapshotPanel**

Create `client/src/modules/deals/components/workspace/SnapshotPanel.tsx`:

Displays the opportunity's snapshot fields organized by sections (from the investment type's snapshot config). Each field is shown with its label and value from `snapshotData`. Fields are editable inline — click to edit, blur to save. Uses the investment type's snapshot config to determine field types and section organization. Shows citation indicators for AI-extracted fields.

Read the investment type to get `snapshotConfig.sections`, then for each section render the fields. The field values come from `opportunity.snapshotData[fieldName]`.

Props: `{ opportunity: Opportunity, investmentTypes: InvestmentType[] }`

Uses `dealsApi.updateOpportunity` to save snapshot changes.

- [ ] **Step 3: Create DocumentPanel**

Create `client/src/modules/deals/components/workspace/DocumentPanel.tsx`:

Document editor panel. For Phase 2B, this is a **rich textarea** (not OnlyOffice yet). Shows:
- Document name (editable)
- Status badge (draft/in_review/approved)
- Large textarea with the document `content`
- Auto-save on blur (calls `dealsApi.updateDocument`)
- DocumentActions bar at the top

Props: `{ document: Document, opportunityId: string, onUpdate: (doc: Document) => void }`

- [ ] **Step 4: Create WorkspaceLayout**

Create `client/src/modules/deals/components/workspace/WorkspaceLayout.tsx`:

The split-panel container. Two side-by-side panels with a draggable divider for resizing. Each panel renders either SnapshotPanel or DocumentPanel based on the active tab.

Implementation:
- Two divs side by side with `flex`
- A draggable divider in between (onMouseDown → track mouse move → adjust widths)
- Default split: 40% left, 60% right
- Each panel looks up its tab from `workspaceTabs` and renders the appropriate component
- If only one panel has content, it takes full width

Props: `{ opportunity, investmentTypes, documents, tabs, leftTabId, rightTabId }`

- [ ] **Step 5: Create OpportunityWorkspacePage**

Create `client/src/modules/deals/pages/OpportunityWorkspacePage.tsx`:

The main workspace page at `/home/deals/opportunities/:oppId`.

```typescript
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDealsStore } from '../store'
import { WorkspaceLayout } from '../components/workspace/WorkspaceLayout'
import { WorkspaceTabBar } from '../components/workspace/WorkspaceTabBar'
import { CreateDocumentDialog } from '../components/workspace/CreateDocumentDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function OpportunityWorkspacePage() {
  const { oppId } = useParams<{ oppId: string }>()
  const navigate = useNavigate()
  const {
    activeOpportunity, workspaceDocuments, workspaceTabs,
    leftPanelTabId, rightPanelTabId, loadingWorkspace,
    fetchWorkspace, fetchInvestmentTypes, investmentTypes,
    setLeftPanel, setRightPanel,
  } = useDealsStore()
  const [showCreateDoc, setShowCreateDoc] = useState(false)

  useEffect(() => {
    if (oppId) {
      fetchWorkspace(oppId)
      if (investmentTypes.length === 0) fetchInvestmentTypes()
    }
  }, [oppId, fetchWorkspace, fetchInvestmentTypes, investmentTypes.length])

  if (loadingWorkspace || !activeOpportunity) {
    return <div className="text-muted-foreground p-6">Loading workspace...</div>
  }

  const handleTabClick = (tabId: string, panel: 'left' | 'right') => {
    if (panel === 'left') setLeftPanel(tabId)
    else setRightPanel(tabId)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home/deals/opportunities')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-lg font-semibold">{activeOpportunity.name}</h1>
        <Badge>{activeOpportunity.pipelineStatus}</Badge>
        {activeOpportunity.assetManagerName && (
          <span className="text-sm text-muted-foreground">{activeOpportunity.assetManagerName}</span>
        )}
        {activeOpportunity.investmentTypeName && (
          <Badge variant="outline">{activeOpportunity.investmentTypeName}</Badge>
        )}
      </div>

      {/* Tab Bar */}
      <WorkspaceTabBar
        tabs={workspaceTabs}
        leftTabId={leftPanelTabId}
        rightTabId={rightPanelTabId}
        onTabClick={handleTabClick}
        onNewDocument={() => setShowCreateDoc(true)}
      />

      {/* Split Panels */}
      <div className="flex-1 overflow-hidden">
        <WorkspaceLayout
          opportunity={activeOpportunity}
          investmentTypes={investmentTypes}
          documents={workspaceDocuments}
          tabs={workspaceTabs}
          leftTabId={leftPanelTabId}
          rightTabId={rightPanelTabId}
        />
      </div>

      {showCreateDoc && (
        <CreateDocumentDialog
          opportunityId={activeOpportunity.id}
          onClose={() => setShowCreateDoc(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Add route to App.tsx**

```tsx
import { OpportunityWorkspacePage } from '@/modules/deals/pages/OpportunityWorkspacePage'

// Inside deals routes:
<Route path="opportunities/:oppId" element={<OpportunityWorkspacePage />} />
```

- [ ] **Step 7: Commit**

```bash
git add client/src/modules/deals/pages/OpportunityWorkspacePage.tsx client/src/modules/deals/components/workspace/ client/src/App.tsx
git commit -m "feat(deals): add opportunity workspace with split panels and snapshot/document views"
```

---

## Task 5: Frontend — Document Creation & Actions

**Files:**
- Create: `client/src/modules/deals/components/workspace/CreateDocumentDialog.tsx`
- Create: `client/src/modules/deals/components/workspace/DocumentActions.tsx`

### Steps

- [ ] **Step 1: Create CreateDocumentDialog**

Create `client/src/modules/deals/components/workspace/CreateDocumentDialog.tsx`:

Dialog for creating a new document in the workspace. Fields:
- Document Type (select: Investment Memo, Pre-Screening Report, DDQ, Market Analysis, News/Insights, Custom)
- Name (auto-populated based on type + opportunity name, editable)
- Template (select from templates matching the opportunity's investment type — fetch from store)

On submit: calls `dealsApi.createDocument(opportunityId, { name, documentType, templateId })`. Adds the new document to workspace via `addWorkspaceDocument`. Closes dialog.

Props: `{ opportunityId: string, onClose: () => void }`

- [ ] **Step 2: Create DocumentActions**

Create `client/src/modules/deals/components/workspace/DocumentActions.tsx`:

Action bar shown at the top of the DocumentPanel. Buttons:
- **Send for Validation** — opens ValidationDialog
- **Share** — opens ShareDialog
- **Send via Email** — opens SendEmailDialog (disabled with tooltip "Coming soon" for Phase 2B)
- **Download** — disabled with tooltip "Coming soon — requires OnlyOffice"

Shows document status badge. If document is in_review, shows a "In Review" indicator.

Props: `{ document: Document, opportunityId: string }`

- [ ] **Step 3: Commit**

```bash
git add client/src/modules/deals/components/workspace/
git commit -m "feat(deals): add document creation dialog and action bar"
```

---

## Task 6: Frontend — Validation & Sharing Dialogs

**Files:**
- Create: `client/src/modules/deals/components/workspace/ValidationDialog.tsx`
- Create: `client/src/modules/deals/components/workspace/ShareDialog.tsx`
- Create: `client/src/modules/deals/components/workspace/SendEmailDialog.tsx`
- Create: `client/src/modules/deals/components/workspace/ReviewBanner.tsx`

### Steps

- [ ] **Step 1: Create ValidationDialog**

Create `client/src/modules/deals/components/workspace/ValidationDialog.tsx`:

Dialog for sending documents for validation:
- Checkbox list of documents in the workspace (from `workspaceDocuments`)
- Reviewer selector — for now a text input for reviewer user ID (in a future phase, this would be a user picker from the admin users list)
- Submit button calls `dealsApi.createReview({ reviewerId, documentIds })`
- Updates affected documents' status to "in_review"

Props: `{ opportunityId: string, documents: Document[], onClose: () => void }`

- [ ] **Step 2: Create ShareDialog**

Create `client/src/modules/deals/components/workspace/ShareDialog.tsx`:

Dialog for sharing a document with team members:
- Text input for user IDs to share with (comma-separated — simplified for v1, user picker in future)
- Permission select: "Can comment" / "Can view"
- Submit calls `dealsApi.shareDocument(docId, { sharedWith, permission })`

Props: `{ documentId: string, onClose: () => void }`

- [ ] **Step 3: Create SendEmailDialog**

Create `client/src/modules/deals/components/workspace/SendEmailDialog.tsx`:

Placeholder dialog showing "Send via email will be available when Gmail integration is configured in Phase 3." with a Close button.

Props: `{ onClose: () => void }`

- [ ] **Step 4: Create ReviewBanner**

Create `client/src/modules/deals/components/workspace/ReviewBanner.tsx`:

Banner shown at the top of the workspace when documents are in review. Shows: "X documents in review" with reviewer info and status. If the current user is the reviewer, shows "Approve" and "Request Changes" buttons with a rationale textarea.

Props: `{ reviews: DocumentReview[], currentUserId: string, onApprove: (reviewId: string, rationale: string) => void, onRequestChanges: (reviewId: string, rationale: string) => void }`

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/deals/components/workspace/
git commit -m "feat(deals): add validation, sharing, and email dialogs with review banner"
```

---

## Phase 2B Complete

After these 6 tasks, the workspace and collaboration system is functional:

- **Workspace**: Multi-panel split view with resizable divider, snapshot panel with inline-editable fields, document panel with rich textarea editor
- **Document creation**: Type selection, auto-naming, template linking
- **Document actions**: Send for validation, share with team, email (placeholder), download (placeholder)
- **Validation workflow**: Analyst sends selected docs to reviewer → reviewer sees review banner → approves with rationale or requests changes → document status updates
- **Sharing**: Share documents with team members for comment/view access

### Deferred to infrastructure phase:
- OnlyOffice Document Server integration (replace textarea with real WYSIWYG)
- Real-time collaborative editing
- Document version history
- File upload/download as .docx

### Next phases:
- **Phase 3**: Email Hub + Gmail Plugin + Google Drive Bulk Import
