# Deals Module Phase 3 — Email Hub & Google Drive Import

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Email Hub page (connect Gmail via OAuth, browse synced emails read-only, import emails as opportunities) and Google Drive bulk import (connect Drive, browse folders, import multiple opportunities from a folder). Both integrate with the existing opportunity creation pipeline.

**Architecture:** Backend adds email account, synced email, and Google Drive models with CRUD/sync endpoints. Gmail and Google Drive integrations use Google APIs via OAuth 2.0 (authorization code flow). For Phase 3, the actual Google API calls are **stubbed** — the OAuth flow, data models, UI, and endpoints are fully built, but the actual Gmail sync and Drive file processing are mocked. This allows the full UI/UX to be tested and iterated on before wiring up real Google API credentials. Frontend adds the Email Hub page and Google Drive import dialog with MSW mock handlers.

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), React 19, TypeScript, Zustand, shadcn/ui, Tailwind CSS, MSW 2

**Spec:** `docs/superpowers/specs/2026-04-11-deals-module-design.md` — Sections 6 (Email Hub), 7 (Google Drive), 10.3 (Settings > Integrations)

**Depends on:** Phases 1 + 2A + 2B complete

**Google API note:** The actual Google API integration (OAuth credentials, Gmail API sync, Google Drive API file listing) requires Google Cloud Console setup and API keys. This plan builds the complete UI/UX, data model, and endpoint structure with stubbed/mocked Google API calls. Swapping in real Google API calls later only requires implementing the service-layer functions — no architecture changes needed.

---

## File Map

### Backend (new/modified)

```
server/app/modules/deals/
  models.py          — ADD: EmailAccount, Email, EmailAttachment, GoogleDriveAccount, GoogleDriveImportJob
  schemas.py         — ADD: email, google drive schemas
  repository.py      — ADD: email, google drive CRUD queries
  service.py         — ADD: email sync (stubbed), import flow, google drive browse/import (stubbed)
  router.py          — ADD: /email/*, /integrations/google-drive/* endpoints
```

### Frontend (new files)

```
client/src/modules/deals/
  pages/
    EmailHubPage.tsx                     — Connected accounts + email list + preview
  components/
    email/
      EmailAccountList.tsx               — Connected accounts with status badges
      ConnectGmailButton.tsx             — OAuth flow trigger (opens popup)
      EmailList.tsx                      — Read-only email table with filters
      EmailPreview.tsx                   — Email body + attachment list side panel
      ImportEmailDialog.tsx              — Select investment type → confirm import
    google-drive/
      GoogleDriveImportDialog.tsx        — Connect, browse folders, trigger import
      FolderBrowser.tsx                  — Tree view of Drive folders
      ImportProgress.tsx                 — Job progress tracking
```

### Frontend (modified)

```
client/src/modules/deals/
  types.ts            — ADD: EmailAccount, SyncedEmail, EmailAttachment, GoogleDriveAccount, ImportJob types
  api.ts              — ADD: email, google drive API functions
  store.ts            — ADD: email, google drive state + actions
client/src/api/mock/
  data/deals.ts       — ADD: email, google drive mock data
  handlers.ts         — ADD: email, google drive mock handlers
client/src/App.tsx    — ADD: email route
client/src/modules/deals/pages/SettingsPage.tsx — ADD: Integrations tab
client/src/modules/deals/components/opportunities/CreateOpportunityDialog.tsx — ADD: "Import from Google Drive" option
```

---

## Task 1: Backend — Email & Google Drive Models + Migration

**Files:**
- Modify: `server/app/modules/deals/models.py`

### Steps

- [ ] **Step 1: Add email and Google Drive models**

Add to `server/app/modules/deals/models.py`:

```python
class EmailAccount(Base, TenantMixin, TimestampMixin):
    """Connected email integration accounts (Gmail, etc.)."""

    __tablename__ = "email_accounts"
    __table_args__ = {"schema": "deals"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    provider: Mapped[str] = mapped_column(String(20), server_default="gmail", nullable=False)
    email_address: Mapped[str] = mapped_column(String(255), nullable=False)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_labels: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), server_default="connected", nullable=False)


class SyncedEmail(Base, TenantMixin):
    """Read-only copies of emails synced from Gmail."""

    __tablename__ = "emails"
    __table_args__ = (
        Index("ix_emails_tenant_account", "tenant_id", "email_account_id"),
        Index("ix_emails_import_status", "tenant_id", "import_status"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.email_accounts.id", ondelete="CASCADE"), nullable=False
    )
    gmail_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    from_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    from_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    body_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attachment_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    import_status: Mapped[str] = mapped_column(String(20), server_default="new", nullable=False)
    opportunity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    attachments: Mapped[list["EmailAttachment"]] = relationship(
        back_populates="email", cascade="all, delete-orphan", lazy="selectin"
    )


class EmailAttachment(Base):
    """Attachments from synced emails."""

    __tablename__ = "email_attachments"
    __table_args__ = {"schema": "deals"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.emails.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    email: Mapped["SyncedEmail"] = relationship(back_populates="attachments")


class GoogleDriveAccount(Base, TenantMixin, TimestampMixin):
    """Connected Google Drive accounts."""

    __tablename__ = "google_drive_accounts"
    __table_args__ = {"schema": "deals"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    email_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), server_default="connected", nullable=False)


class GoogleDriveImportJob(Base, TenantMixin):
    """Tracks Google Drive folder import jobs."""

    __tablename__ = "google_drive_import_jobs"
    __table_args__ = (
        Index("ix_gdrive_jobs_tenant", "tenant_id", "status"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.google_drive_accounts.id", ondelete="CASCADE"), nullable=False
    )
    folder_paths: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[str] = mapped_column(String(20), server_default="pending", nullable=False)
    total_files: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    processed_files: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    opportunities_created: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    error_log: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
```

- [ ] **Step 2: Generate and run migration**

```bash
cd server
alembic revision --autogenerate -m "deals: add email accounts, emails, attachments, google drive accounts, import jobs"
alembic upgrade head
```

- [ ] **Step 3: Commit**

```bash
git add server/app/modules/deals/models.py server/app/database/migrations/versions/
git commit -m "feat(deals): add email and Google Drive integration models"
```

---

## Task 2: Backend — Email & Google Drive API Endpoints

**Files:**
- Modify: `server/app/modules/deals/schemas.py`
- Modify: `server/app/modules/deals/repository.py`
- Modify: `server/app/modules/deals/service.py`
- Modify: `server/app/modules/deals/router.py`

### Steps

- [ ] **Step 1: Add schemas**

Add to `server/app/modules/deals/schemas.py`:

```python
# ── Email Accounts ──────────────────────────────────────────────────

class EmailAccountResponse(BaseModel):
    id: str
    userId: str
    provider: str
    emailAddress: str
    status: str
    lastSyncedAt: datetime | None
    syncLabels: list[str] | None
    createdAt: datetime
    updatedAt: datetime


class EmailAccountCreate(BaseModel):
    provider: str = "gmail"
    emailAddress: str
    accessToken: str | None = None
    refreshToken: str | None = None


# ── Synced Emails ───────────────────────────────────────────────────

class EmailAttachmentResponse(BaseModel):
    id: str
    fileName: str | None
    fileType: str | None
    fileSize: int | None


class SyncedEmailResponse(BaseModel):
    id: str
    emailAccountId: str
    fromAddress: str | None
    fromName: str | None
    subject: str | None
    bodyText: str | None
    bodyHtml: str | None
    receivedAt: datetime | None
    attachmentCount: int
    importStatus: str
    opportunityId: str | None
    attachments: list[EmailAttachmentResponse]
    createdAt: datetime


class ImportEmailRequest(BaseModel):
    investmentTypeId: str


# ── Google Drive ────────────────────────────────────────────────────

class GoogleDriveAccountResponse(BaseModel):
    id: str
    userId: str
    emailAddress: str | None
    status: str
    createdAt: datetime
    updatedAt: datetime


class GoogleDriveAccountCreate(BaseModel):
    emailAddress: str | None = None
    accessToken: str | None = None
    refreshToken: str | None = None


class DriveFolder(BaseModel):
    id: str
    name: str
    path: str
    hasChildren: bool


class DriveBrowseResponse(BaseModel):
    folders: list[DriveFolder]


class GoogleDriveImportRequest(BaseModel):
    folderIds: list[str]


class GoogleDriveImportJobResponse(BaseModel):
    id: str
    accountId: str
    folderPaths: list[str] | None
    status: str
    totalFiles: int
    processedFiles: int
    opportunitiesCreated: int
    errorLog: dict | None
    startedAt: datetime | None
    completedAt: datetime | None
    createdAt: datetime
```

- [ ] **Step 2: Add repository functions**

Add to `server/app/modules/deals/repository.py`:

```python
from app.modules.deals.models import EmailAccount, SyncedEmail, GoogleDriveAccount, GoogleDriveImportJob

# ── Email Accounts ──────────────────────────────────────────────────

async def list_email_accounts(db: AsyncSession, tenant_id: uuid.UUID) -> list[EmailAccount]:
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.tenant_id == tenant_id).order_by(EmailAccount.created_at)
    )
    return list(result.scalars().all())

async def get_email_account(db: AsyncSession, tenant_id: uuid.UUID, account_id: uuid.UUID) -> EmailAccount | None:
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.tenant_id == tenant_id, EmailAccount.id == account_id)
    )
    return result.scalar_one_or_none()

async def create_email_account(db: AsyncSession, account: EmailAccount) -> EmailAccount:
    db.add(account)
    await db.flush()
    return account

async def delete_email_account(db: AsyncSession, account: EmailAccount) -> None:
    await db.delete(account)
    await db.flush()

# ── Synced Emails ───────────────────────────────────────────────────

async def list_emails(
    db: AsyncSession, tenant_id: uuid.UUID,
    account_id: uuid.UUID | None = None,
    import_status: str | None = None,
    has_attachments: bool | None = None,
    search: str | None = None,
) -> list[SyncedEmail]:
    stmt = select(SyncedEmail).where(SyncedEmail.tenant_id == tenant_id)
    if account_id:
        stmt = stmt.where(SyncedEmail.email_account_id == account_id)
    if import_status:
        stmt = stmt.where(SyncedEmail.import_status == import_status)
    if has_attachments is True:
        stmt = stmt.where(SyncedEmail.attachment_count > 0)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            SyncedEmail.subject.ilike(search_filter) | SyncedEmail.from_name.ilike(search_filter) | SyncedEmail.from_address.ilike(search_filter)
        )
    stmt = stmt.order_by(SyncedEmail.received_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_email(db: AsyncSession, tenant_id: uuid.UUID, email_id: uuid.UUID) -> SyncedEmail | None:
    result = await db.execute(
        select(SyncedEmail).where(SyncedEmail.tenant_id == tenant_id, SyncedEmail.id == email_id)
    )
    return result.scalar_one_or_none()

async def update_email(db: AsyncSession, email: SyncedEmail, data: dict) -> SyncedEmail:
    for key, value in data.items():
        if value is not None:
            setattr(email, key, value)
    await db.flush()
    return email

# ── Google Drive ────────────────────────────────────────────────────

async def list_google_drive_accounts(db: AsyncSession, tenant_id: uuid.UUID) -> list[GoogleDriveAccount]:
    result = await db.execute(
        select(GoogleDriveAccount).where(GoogleDriveAccount.tenant_id == tenant_id)
    )
    return list(result.scalars().all())

async def get_google_drive_account(db: AsyncSession, tenant_id: uuid.UUID, account_id: uuid.UUID) -> GoogleDriveAccount | None:
    result = await db.execute(
        select(GoogleDriveAccount).where(GoogleDriveAccount.tenant_id == tenant_id, GoogleDriveAccount.id == account_id)
    )
    return result.scalar_one_or_none()

async def create_google_drive_account(db: AsyncSession, account: GoogleDriveAccount) -> GoogleDriveAccount:
    db.add(account)
    await db.flush()
    return account

async def delete_google_drive_account(db: AsyncSession, account: GoogleDriveAccount) -> None:
    await db.delete(account)
    await db.flush()

async def create_import_job(db: AsyncSession, job: GoogleDriveImportJob) -> GoogleDriveImportJob:
    db.add(job)
    await db.flush()
    return job

async def get_import_job(db: AsyncSession, tenant_id: uuid.UUID, job_id: uuid.UUID) -> GoogleDriveImportJob | None:
    result = await db.execute(
        select(GoogleDriveImportJob).where(GoogleDriveImportJob.tenant_id == tenant_id, GoogleDriveImportJob.id == job_id)
    )
    return result.scalar_one_or_none()
```

- [ ] **Step 3: Add service functions**

Add to `server/app/modules/deals/service.py`:

```python
from app.modules.deals.models import EmailAccount, SyncedEmail, GoogleDriveAccount, GoogleDriveImportJob
from app.modules.deals.schemas import (
    EmailAccountCreate, EmailAccountResponse,
    SyncedEmailResponse, EmailAttachmentResponse, ImportEmailRequest,
    GoogleDriveAccountCreate, GoogleDriveAccountResponse,
    DriveBrowseResponse, DriveFolder,
    GoogleDriveImportRequest, GoogleDriveImportJobResponse,
)
from datetime import datetime, timezone


def _email_account_to_response(account: EmailAccount) -> EmailAccountResponse:
    return EmailAccountResponse(
        id=str(account.id),
        userId=str(account.user_id),
        provider=account.provider,
        emailAddress=account.email_address,
        status=account.status,
        lastSyncedAt=account.last_synced_at,
        syncLabels=account.sync_labels,
        createdAt=account.created_at,
        updatedAt=account.updated_at,
    )


def _email_to_response(email: SyncedEmail) -> SyncedEmailResponse:
    return SyncedEmailResponse(
        id=str(email.id),
        emailAccountId=str(email.email_account_id),
        fromAddress=email.from_address,
        fromName=email.from_name,
        subject=email.subject,
        bodyText=email.body_text,
        bodyHtml=email.body_html,
        receivedAt=email.received_at,
        attachmentCount=email.attachment_count,
        importStatus=email.import_status,
        opportunityId=str(email.opportunity_id) if email.opportunity_id else None,
        attachments=[
            EmailAttachmentResponse(
                id=str(a.id),
                fileName=a.file_name,
                fileType=a.file_type,
                fileSize=a.file_size,
            )
            for a in email.attachments
        ],
        createdAt=email.created_at,
    )


def _gdrive_account_to_response(account: GoogleDriveAccount) -> GoogleDriveAccountResponse:
    return GoogleDriveAccountResponse(
        id=str(account.id),
        userId=str(account.user_id),
        emailAddress=account.email_address,
        status=account.status,
        createdAt=account.created_at,
        updatedAt=account.updated_at,
    )


def _import_job_to_response(job: GoogleDriveImportJob) -> GoogleDriveImportJobResponse:
    return GoogleDriveImportJobResponse(
        id=str(job.id),
        accountId=str(job.account_id),
        folderPaths=job.folder_paths,
        status=job.status,
        totalFiles=job.total_files,
        processedFiles=job.processed_files,
        opportunitiesCreated=job.opportunities_created,
        errorLog=job.error_log,
        startedAt=job.started_at,
        completedAt=job.completed_at,
        createdAt=job.created_at,
    )


# ── Email Accounts ──────────────────────────────────────────────────

async def list_email_accounts(db, tenant_id):
    accounts = await repo.list_email_accounts(db, tenant_id)
    return [_email_account_to_response(a) for a in accounts]

async def connect_email_account(db, tenant_id, user_id, data: EmailAccountCreate):
    account = EmailAccount(
        tenant_id=tenant_id,
        user_id=user_id,
        provider=data.provider,
        email_address=data.emailAddress,
        access_token=data.accessToken,
        refresh_token=data.refreshToken,
        status="connected",
    )
    created = await repo.create_email_account(db, account)
    return _email_account_to_response(created)

async def disconnect_email_account(db, tenant_id, account_id):
    account = await repo.get_email_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Email account not found")
    await repo.delete_email_account(db, account)

async def trigger_email_sync(db, tenant_id, account_id):
    """Stub: In production, this would trigger a Celery task to sync emails via Gmail API."""
    account = await repo.get_email_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Email account not found")
    # Update last_synced_at to indicate sync was triggered
    account.last_synced_at = datetime.now(timezone.utc)
    await db.flush()
    return _email_account_to_response(account)

# ── Synced Emails ───────────────────────────────────────────────────

async def list_emails(db, tenant_id, account_id=None, import_status=None, has_attachments=None, search=None):
    emails = await repo.list_emails(db, tenant_id, account_id, import_status, has_attachments, search)
    return [_email_to_response(e) for e in emails]

async def get_email(db, tenant_id, email_id):
    email = await repo.get_email(db, tenant_id, email_id)
    if not email:
        raise not_found("Email not found")
    return _email_to_response(email)

async def import_email_as_opportunity(db, tenant_id, user_id, email_id, data: ImportEmailRequest):
    """Import an email as a new opportunity. Stub: In production, this would vectorize attachments and extract snapshot via LLM."""
    email = await repo.get_email(db, tenant_id, email_id)
    if not email:
        raise not_found("Email not found")
    # Create opportunity from email
    opp = Opportunity(
        tenant_id=tenant_id,
        name=email.subject or "Untitled Opportunity",
        investment_type_id=uuid.UUID(data.investmentTypeId),
        pipeline_status="new",
        source_type="email",
        source_email_id=email.id,
        snapshot_data={"Deal Name": email.subject, "Source / Referral": email.from_name or email.from_address},
        created_by=user_id,
    )
    created_opp = await repo.create_opportunity(db, opp)
    # Update email import status
    await repo.update_email(db, email, {"import_status": "imported", "opportunity_id": created_opp.id})
    return _opportunity_to_response(created_opp)

async def ignore_email(db, tenant_id, email_id):
    email = await repo.get_email(db, tenant_id, email_id)
    if not email:
        raise not_found("Email not found")
    await repo.update_email(db, email, {"import_status": "ignored"})

# ── Google Drive ────────────────────────────────────────────────────

async def list_google_drive_accounts(db, tenant_id):
    accounts = await repo.list_google_drive_accounts(db, tenant_id)
    return [_gdrive_account_to_response(a) for a in accounts]

async def connect_google_drive(db, tenant_id, user_id, data: GoogleDriveAccountCreate):
    account = GoogleDriveAccount(
        tenant_id=tenant_id,
        user_id=user_id,
        email_address=data.emailAddress,
        access_token=data.accessToken,
        refresh_token=data.refreshToken,
        status="connected",
    )
    created = await repo.create_google_drive_account(db, account)
    return _gdrive_account_to_response(created)

async def disconnect_google_drive(db, tenant_id, account_id):
    account = await repo.get_google_drive_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Google Drive account not found")
    await repo.delete_google_drive_account(db, account)

async def browse_google_drive(db, tenant_id, account_id, parent_folder_id=None):
    """Stub: Returns mock folder structure. In production, calls Google Drive API."""
    account = await repo.get_google_drive_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Google Drive account not found")
    # Return stubbed folder list
    return DriveBrowseResponse(folders=[
        DriveFolder(id="folder-1", name="Deal Documents 2026", path="/Deal Documents 2026", hasChildren=True),
        DriveFolder(id="folder-2", name="Fund Opportunities", path="/Fund Opportunities", hasChildren=True),
        DriveFolder(id="folder-3", name="Direct Investments", path="/Direct Investments", hasChildren=False),
    ])

async def start_google_drive_import(db, tenant_id, user_id, account_id, data: GoogleDriveImportRequest):
    """Create an import job. Stub: In production, dispatches Celery task."""
    account = await repo.get_google_drive_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Google Drive account not found")
    job = GoogleDriveImportJob(
        tenant_id=tenant_id,
        account_id=account.id,
        folder_paths=data.folderIds,
        status="processing",
        total_files=0,
        started_at=datetime.now(timezone.utc),
        created_by=user_id,
    )
    created = await repo.create_import_job(db, job)
    return _import_job_to_response(created)

async def get_import_job(db, tenant_id, job_id):
    job = await repo.get_import_job(db, tenant_id, job_id)
    if not job:
        raise not_found("Import job not found")
    return _import_job_to_response(job)
```

- [ ] **Step 4: Add router endpoints**

Add to `server/app/modules/deals/router.py`:

```python
from app.modules.deals.schemas import (
    EmailAccountCreate, EmailAccountResponse,
    SyncedEmailResponse, ImportEmailRequest,
    GoogleDriveAccountCreate, GoogleDriveAccountResponse,
    DriveBrowseResponse, GoogleDriveImportRequest, GoogleDriveImportJobResponse,
)

# ── Email Accounts ──────────────────────────────────────────────────

@router.get("/email/accounts", response_model=SuccessResponse[list[EmailAccountResponse]])
async def list_email_accounts(user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.list_email_accounts(db, user.tenant_id)
    return SuccessResponse(data=data)

@router.post("/email/accounts", response_model=SuccessResponse[EmailAccountResponse], status_code=201)
async def connect_email_account(body: EmailAccountCreate, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.connect_email_account(db, user.tenant_id, user.id, body)
    return SuccessResponse(data=data)

@router.delete("/email/accounts/{account_id}", status_code=204)
async def disconnect_email_account(account_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    await service.disconnect_email_account(db, user.tenant_id, account_id)
    return Response(status_code=204)

@router.post("/email/accounts/{account_id}/sync", response_model=SuccessResponse[EmailAccountResponse])
async def trigger_email_sync(account_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.trigger_email_sync(db, user.tenant_id, account_id)
    return SuccessResponse(data=data)

# ── Synced Emails ───────────────────────────────────────────────────

@router.get("/emails", response_model=SuccessResponse[list[SyncedEmailResponse]])
async def list_emails(
    account_id: uuid.UUID | None = Query(None, alias="accountId"),
    import_status: str | None = Query(None, alias="importStatus"),
    has_attachments: bool | None = Query(None, alias="hasAttachments"),
    search: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_emails(db, user.tenant_id, account_id, import_status, has_attachments, search)
    return SuccessResponse(data=data)

@router.get("/emails/{email_id}", response_model=SuccessResponse[SyncedEmailResponse])
async def get_email(email_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.get_email(db, user.tenant_id, email_id)
    return SuccessResponse(data=data)

@router.post("/emails/{email_id}/import", response_model=SuccessResponse, status_code=201)
async def import_email(email_id: uuid.UUID, body: ImportEmailRequest, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.import_email_as_opportunity(db, user.tenant_id, user.id, email_id, body)
    return SuccessResponse(data=data)

@router.put("/emails/{email_id}/ignore", status_code=204)
async def ignore_email(email_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    await service.ignore_email(db, user.tenant_id, email_id)
    return Response(status_code=204)

# ── Google Drive ────────────────────────────────────────────────────

@router.post("/integrations/google-drive", response_model=SuccessResponse[GoogleDriveAccountResponse], status_code=201)
async def connect_google_drive(body: GoogleDriveAccountCreate, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.connect_google_drive(db, user.tenant_id, user.id, body)
    return SuccessResponse(data=data)

@router.delete("/integrations/google-drive/{account_id}", status_code=204)
async def disconnect_google_drive(account_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    await service.disconnect_google_drive(db, user.tenant_id, account_id)
    return Response(status_code=204)

@router.get("/integrations/google-drive/browse", response_model=SuccessResponse[DriveBrowseResponse])
async def browse_google_drive(
    account_id: uuid.UUID = Query(..., alias="accountId"),
    parent_folder_id: str | None = Query(None, alias="parentFolderId"),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.browse_google_drive(db, user.tenant_id, account_id, parent_folder_id)
    return SuccessResponse(data=data)

@router.post("/integrations/google-drive/import", response_model=SuccessResponse[GoogleDriveImportJobResponse], status_code=201)
async def start_google_drive_import(
    account_id: uuid.UUID = Query(..., alias="accountId"),
    body: GoogleDriveImportRequest = ...,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.start_google_drive_import(db, user.tenant_id, user.id, account_id, body)
    return SuccessResponse(data=data)

@router.get("/integrations/google-drive/import/{job_id}", response_model=SuccessResponse[GoogleDriveImportJobResponse])
async def get_import_job(job_id: uuid.UUID, user: CurrentUser = DealsRead, db: AsyncSession = Depends(get_db_with_tenant)):
    data = await service.get_import_job(db, user.tenant_id, job_id)
    return SuccessResponse(data=data)
```

- [ ] **Step 5: Commit**

```bash
git add server/app/modules/deals/
git commit -m "feat(deals): add email hub and Google Drive integration API endpoints"
```

---

## Task 3: Frontend — Email & Drive Types, API, Store, MSW Mocks

**Files:**
- Modify: `client/src/modules/deals/types.ts`
- Modify: `client/src/modules/deals/api.ts`
- Modify: `client/src/modules/deals/store.ts`
- Modify: `client/src/api/mock/data/deals.ts`
- Modify: `client/src/api/mock/handlers.ts`

### Steps

- [ ] **Step 1: Add types**

Add to `client/src/modules/deals/types.ts`:

```typescript
// ── Email Integration ──────────────────────────────────────────────

export type EmailImportStatus = 'new' | 'imported' | 'ignored'

export interface EmailAccount {
  id: string
  userId: string
  provider: string
  emailAddress: string
  status: 'connected' | 'syncing' | 'error' | 'disconnected'
  lastSyncedAt: string | null
  syncLabels: string[] | null
  createdAt: string
  updatedAt: string
}

export interface EmailAttachment {
  id: string
  fileName: string | null
  fileType: string | null
  fileSize: number | null
}

export interface SyncedEmail {
  id: string
  emailAccountId: string
  fromAddress: string | null
  fromName: string | null
  subject: string | null
  bodyText: string | null
  bodyHtml: string | null
  receivedAt: string | null
  attachmentCount: number
  importStatus: EmailImportStatus
  opportunityId: string | null
  attachments: EmailAttachment[]
  createdAt: string
}

// ── Google Drive ───────────────────────────────────────────────────

export interface GoogleDriveAccount {
  id: string
  userId: string
  emailAddress: string | null
  status: 'connected' | 'disconnected'
  createdAt: string
  updatedAt: string
}

export interface DriveFolder {
  id: string
  name: string
  path: string
  hasChildren: boolean
}

export interface GoogleDriveImportJob {
  id: string
  accountId: string
  folderPaths: string[] | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalFiles: number
  processedFiles: number
  opportunitiesCreated: number
  errorLog: Record<string, unknown> | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}
```

- [ ] **Step 2: Add API functions**

Add to `client/src/modules/deals/api.ts`:

```typescript
  // Email Accounts
  listEmailAccounts: () => api.get<EmailAccount[]>('/deals/email/accounts'),
  connectEmailAccount: (data: { provider?: string; emailAddress: string }) =>
    api.post<EmailAccount>('/deals/email/accounts', data),
  disconnectEmailAccount: (id: string) => api.delete<void>(`/deals/email/accounts/${id}`),
  triggerEmailSync: (id: string) =>
    api.post<EmailAccount>(`/deals/email/accounts/${id}/sync`, {}),

  // Synced Emails
  listEmails: (filters?: { accountId?: string; importStatus?: string; hasAttachments?: boolean; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.accountId) params.set('accountId', filters.accountId)
    if (filters?.importStatus) params.set('importStatus', filters.importStatus)
    if (filters?.hasAttachments !== undefined) params.set('hasAttachments', String(filters.hasAttachments))
    if (filters?.search) params.set('search', filters.search)
    const qs = params.toString()
    return api.get<SyncedEmail[]>(`/deals/emails${qs ? `?${qs}` : ''}`)
  },
  getEmail: (id: string) => api.get<SyncedEmail>(`/deals/emails/${id}`),
  importEmail: (id: string, data: { investmentTypeId: string }) =>
    api.post<Opportunity>(`/deals/emails/${id}/import`, data),
  ignoreEmail: (id: string) => api.put<void>(`/deals/emails/${id}/ignore`, {}),

  // Google Drive
  connectGoogleDrive: (data: { emailAddress?: string }) =>
    api.post<GoogleDriveAccount>('/deals/integrations/google-drive', data),
  disconnectGoogleDrive: (id: string) =>
    api.delete<void>(`/deals/integrations/google-drive/${id}`),
  browseGoogleDrive: (accountId: string, parentFolderId?: string) => {
    const params = new URLSearchParams({ accountId })
    if (parentFolderId) params.set('parentFolderId', parentFolderId)
    return api.get<{ folders: DriveFolder[] }>(`/deals/integrations/google-drive/browse?${params}`)
  },
  startGoogleDriveImport: (accountId: string, data: { folderIds: string[] }) =>
    api.post<GoogleDriveImportJob>(`/deals/integrations/google-drive/import?accountId=${accountId}`, data),
  getImportJob: (jobId: string) =>
    api.get<GoogleDriveImportJob>(`/deals/integrations/google-drive/import/${jobId}`),
```

- [ ] **Step 3: Add store state**

Add to `client/src/modules/deals/store.ts`:

```typescript
  // Email Hub
  emailAccounts: EmailAccount[]
  syncedEmails: SyncedEmail[]
  selectedEmail: SyncedEmail | null
  loadingEmails: boolean

  // Google Drive
  googleDriveAccounts: GoogleDriveAccount[]
  driveFolders: DriveFolder[]
  activeImportJob: GoogleDriveImportJob | null

  fetchEmailAccounts: () => Promise<void>
  fetchEmails: (filters?: { accountId?: string; importStatus?: string; search?: string }) => Promise<void>
  selectEmail: (email: SyncedEmail | null) => void
  fetchGoogleDriveAccounts: () => Promise<void>
```

With implementations following the existing pattern (set loading, try/catch, set data).

- [ ] **Step 4: Add MSW mock data and handlers**

Add to `client/src/api/mock/data/deals.ts`:

- `MOCK_EMAIL_ACCOUNTS`: 1 connected Gmail account
- `MOCK_SYNCED_EMAILS`: 8 emails with realistic subjects, from addresses, dates, attachment counts, mix of import statuses (5 new, 2 imported, 1 ignored)
- `MOCK_GOOGLE_DRIVE_ACCOUNTS`: 1 connected account
- `MOCK_DRIVE_FOLDERS`: 3 folders

Add handlers to `client/src/api/mock/handlers.ts`:

- GET/POST/DELETE `/api/deals/email/accounts`
- POST `/api/deals/email/accounts/:id/sync`
- GET `/api/deals/emails` (with filters)
- GET `/api/deals/emails/:id`
- POST `/api/deals/emails/:id/import` (creates opportunity, updates email status)
- PUT `/api/deals/emails/:id/ignore`
- POST/DELETE `/api/deals/integrations/google-drive`
- GET `/api/deals/integrations/google-drive/browse`
- POST `/api/deals/integrations/google-drive/import`
- GET `/api/deals/integrations/google-drive/import/:jobId`

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/deals/types.ts client/src/modules/deals/api.ts client/src/modules/deals/store.ts client/src/api/mock/data/deals.ts client/src/api/mock/handlers.ts
git commit -m "feat(deals): add email and Google Drive types, API, store, and MSW mocks"
```

---

## Task 4: Frontend — Email Hub Page

**Files:**
- Create: `client/src/modules/deals/components/email/EmailAccountList.tsx`
- Create: `client/src/modules/deals/components/email/ConnectGmailButton.tsx`
- Create: `client/src/modules/deals/components/email/EmailList.tsx`
- Create: `client/src/modules/deals/components/email/EmailPreview.tsx`
- Create: `client/src/modules/deals/components/email/ImportEmailDialog.tsx`
- Create: `client/src/modules/deals/pages/EmailHubPage.tsx`
- Modify: `client/src/App.tsx`

### Steps

- [ ] **Step 1: Create EmailAccountList**

Shows connected email accounts as compact cards: email address, provider badge (Gmail), status indicator (green dot = connected, amber = syncing, red = error), last synced timestamp, "Sync Now" button, "Disconnect" button (with confirmation).

Props: `{ accounts: EmailAccount[], onSync: (id: string) => void, onDisconnect: (id: string) => void }`

- [ ] **Step 2: Create ConnectGmailButton**

Button that initiates Gmail connection. For Phase 3 (stubbed OAuth), clicking creates a mock account via `dealsApi.connectEmailAccount({ provider: 'gmail', emailAddress: 'analyst@company.com' })`. In production, this would open an OAuth popup.

Shows a Gmail icon + "Connect Gmail" text.

- [ ] **Step 3: Create EmailList**

Table showing synced emails. Columns: checkbox (for bulk actions), From (name + address), Subject, Date (relative), Attachments (count with paperclip icon), Status (badge: New=blue, Imported=green with link, Ignored=gray).

Filters above the table: account selector (dropdown), status filter (All/New/Imported/Ignored), search input.

Clicking a row selects the email and shows it in the preview panel.

Props: `{ emails: SyncedEmail[], selectedId: string | null, onSelect: (email: SyncedEmail) => void, onImport: (email: SyncedEmail) => void, onIgnore: (emailId: string) => void }`

- [ ] **Step 4: Create EmailPreview**

Side panel showing the full email content when an email is selected:
- From (name + address), To, Date, Subject as headers
- Body text (rendered, or bodyHtml if available)
- Attachment list with file names, types, sizes
- "Add as Opportunity" button (primary) — opens ImportEmailDialog
- "Ignore" button (ghost) — marks as ignored

Props: `{ email: SyncedEmail, onImport: () => void, onIgnore: () => void, onClose: () => void }`

- [ ] **Step 5: Create ImportEmailDialog**

Dialog for importing an email as an opportunity:
- Shows email subject as context
- Investment Type selector (dropdown from store's investmentTypes)
- "Import" button — calls `dealsApi.importEmail(emailId, { investmentTypeId })`, then refreshes emails list
- After import, shows success message with link to the new opportunity

Props: `{ email: SyncedEmail, onClose: () => void }`

- [ ] **Step 6: Create EmailHubPage**

The main Email Hub page at `/home/deals/email`:
- Top section: EmailAccountList + ConnectGmailButton
- Main area: two-column layout — EmailList (left, ~60%) + EmailPreview (right, ~40%)
- Email preview shown when an email is selected, hidden otherwise (full-width list when no selection)
- Fetches emailAccounts and emails on mount

- [ ] **Step 7: Add route**

```tsx
import { EmailHubPage } from '@/modules/deals/pages/EmailHubPage'
<Route path="email" element={<EmailHubPage />} />
```

- [ ] **Step 8: Commit**

```bash
git add client/src/modules/deals/pages/EmailHubPage.tsx client/src/modules/deals/components/email/ client/src/App.tsx
git commit -m "feat(deals): add Email Hub page with connected accounts, email list, and import"
```

---

## Task 5: Frontend — Google Drive Import Dialog & Settings Integration Tab

**Files:**
- Create: `client/src/modules/deals/components/google-drive/GoogleDriveImportDialog.tsx`
- Create: `client/src/modules/deals/components/google-drive/FolderBrowser.tsx`
- Create: `client/src/modules/deals/components/google-drive/ImportProgress.tsx`
- Modify: `client/src/modules/deals/pages/SettingsPage.tsx` (add Integrations tab)
- Modify: `client/src/modules/deals/components/opportunities/CreateOpportunityDialog.tsx` (add Drive import option)

### Steps

- [ ] **Step 1: Create FolderBrowser**

Tree-view component for browsing Google Drive folders. Shows folder name + icon. Folders with `hasChildren` show an expand arrow. Clicking a folder loads its children (calls `dealsApi.browseGoogleDrive`). Checkboxes to select folders for import.

Props: `{ accountId: string, selectedFolderIds: string[], onSelectionChange: (ids: string[]) => void }`

- [ ] **Step 2: Create ImportProgress**

Shows the progress of a Google Drive import job. Polls `dealsApi.getImportJob` every 3 seconds until status is 'completed' or 'failed'. Shows: progress bar (processedFiles / totalFiles), status text, opportunities created count, error log if failed.

Props: `{ jobId: string, onComplete: () => void }`

- [ ] **Step 3: Create GoogleDriveImportDialog**

Multi-step dialog:
1. **Connect** — if no Google Drive account connected, show "Connect Google Drive" button (stubbed: creates mock account). If connected, skip to step 2.
2. **Browse & Select** — FolderBrowser component, select folders to import
3. **Import** — confirm selection, start import, show ImportProgress
4. **Done** — success message with count of opportunities created

Props: `{ onClose: () => void }`

- [ ] **Step 4: Add Integrations tab to SettingsPage**

Modify `client/src/modules/deals/pages/SettingsPage.tsx` to add a third tab "Integrations":
- Gmail section: list connected accounts, connect/disconnect, sync settings
- Google Drive section: list connected accounts, connect/disconnect

- [ ] **Step 5: Add "Import from Google Drive" to CreateOpportunityDialog**

Modify `client/src/modules/deals/components/opportunities/CreateOpportunityDialog.tsx` to add a secondary action: "Import from Google Drive" button that opens the GoogleDriveImportDialog.

- [ ] **Step 6: Commit**

```bash
git add client/src/modules/deals/components/google-drive/ client/src/modules/deals/pages/SettingsPage.tsx client/src/modules/deals/components/opportunities/CreateOpportunityDialog.tsx
git commit -m "feat(deals): add Google Drive import dialog and settings integrations tab"
```

---

## Phase 3 Complete

After these 5 tasks:

- **Email Hub** — fully functional page with connected accounts, synced email list, preview panel, import-as-opportunity flow, ignore capability. Stubbed Gmail API (mock data via MSW, real API structure ready).
- **Google Drive Import** — multi-step import dialog with folder browser, progress tracking, accessible from opportunities page and settings. Stubbed Drive API.
- **Settings > Integrations** — new tab managing Gmail and Google Drive connections.
- **Backend** — complete data model and API endpoints for email accounts, synced emails, Google Drive accounts, import jobs. Service functions are stubbed but properly structured for real Google API integration.

### What's needed to go live with real Google APIs:
1. Google Cloud Console project with Gmail API + Drive API enabled
2. OAuth 2.0 client credentials (client_id, client_secret, redirect_uri)
3. Backend: implement real OAuth flow in `connect_email_account` and `connect_google_drive`
4. Backend: implement real Gmail sync in `trigger_email_sync` (Celery task)
5. Backend: implement real Drive browsing in `browse_google_drive`
6. Backend: implement real Drive import processing in `start_google_drive_import` (Celery task)

### Full Deals Module Status (All Phases)

| Feature | Status |
|---------|--------|
| Dashboard | Pipeline summary, allocations, funnel, news |
| Mandates | List + detail with strategy overview |
| Opportunities | Pipeline list with status tabs, manual creation |
| Workspace | Split panels, snapshot, document editor, collaboration |
| Email Hub | Connected accounts, email list, preview, import |
| Google Drive | Import dialog, folder browser, progress tracking |
| Asset Managers | List + detail with full profile |
| News | Feed with category filters |
| Settings | Snapshot fields, document templates, integrations |
| MSW Mocks | All endpoints mocked for frontend-only dev |
