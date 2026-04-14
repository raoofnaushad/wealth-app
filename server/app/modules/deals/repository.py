import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import or_

from app.modules.deals.models import (
    AssetManager,
    Document,
    DocumentReview,
    DocumentReviewItem,
    DocumentShare,
    DocumentTemplate,
    EmailAccount,
    EmailAttachment,
    GoogleDriveAccount,
    GoogleDriveImportJob,
    InvestmentType,
    Mandate,
    NewsItem,
    Opportunity,
    SourceFile,
    SyncedEmail,
)


# --- Investment Types ---
async def list_investment_types(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[InvestmentType]:
    result = await db.execute(
        select(InvestmentType)
        .where(InvestmentType.tenant_id == tenant_id)
        .order_by(InvestmentType.sort_order, InvestmentType.name)
    )
    return list(result.scalars().all())


async def get_investment_type(
    db: AsyncSession, tenant_id: uuid.UUID, type_id: uuid.UUID
) -> InvestmentType | None:
    result = await db.execute(
        select(InvestmentType).where(
            InvestmentType.tenant_id == tenant_id, InvestmentType.id == type_id
        )
    )
    return result.scalar_one_or_none()


async def create_investment_type(
    db: AsyncSession, tenant_id: uuid.UUID, data: dict
) -> InvestmentType:
    inv_type = InvestmentType(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=data["name"],
        slug=data["slug"],
        snapshot_config=data["snapshot_config"],
    )
    db.add(inv_type)
    await db.flush()
    return inv_type


async def update_investment_type(
    db: AsyncSession, tenant_id: uuid.UUID, type_id: uuid.UUID, data: dict
) -> InvestmentType | None:
    inv_type = await get_investment_type(db, tenant_id, type_id)
    if not inv_type:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(inv_type, key, value)
    await db.flush()
    return inv_type


async def delete_investment_type(
    db: AsyncSession, tenant_id: uuid.UUID, type_id: uuid.UUID
) -> InvestmentType | None:
    inv_type = await get_investment_type(db, tenant_id, type_id)
    if not inv_type:
        return None
    await db.delete(inv_type)
    await db.flush()
    return inv_type


# --- Document Templates ---
async def list_templates(
    db: AsyncSession, tenant_id: uuid.UUID, investment_type_id: uuid.UUID | None = None
) -> list[DocumentTemplate]:
    stmt = select(DocumentTemplate).where(DocumentTemplate.tenant_id == tenant_id)
    if investment_type_id is not None:
        stmt = stmt.where(DocumentTemplate.investment_type_id == investment_type_id)
    stmt = stmt.order_by(DocumentTemplate.sort_order, DocumentTemplate.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_template(
    db: AsyncSession, tenant_id: uuid.UUID, template_id: uuid.UUID
) -> DocumentTemplate | None:
    result = await db.execute(
        select(DocumentTemplate).where(
            DocumentTemplate.tenant_id == tenant_id, DocumentTemplate.id == template_id
        )
    )
    return result.scalar_one_or_none()


async def update_template(
    db: AsyncSession, tenant_id: uuid.UUID, template_id: uuid.UUID, data: dict
) -> DocumentTemplate | None:
    template = await get_template(db, tenant_id, template_id)
    if not template:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(template, key, value)
    await db.flush()
    return template


# --- Mandates ---
async def list_mandates(
    db: AsyncSession, tenant_id: uuid.UUID, status: str | None = None
) -> list[Mandate]:
    stmt = select(Mandate).where(Mandate.tenant_id == tenant_id)
    if status is not None:
        stmt = stmt.where(Mandate.status == status)
    stmt = stmt.order_by(Mandate.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_mandate(
    db: AsyncSession, tenant_id: uuid.UUID, mandate_id: uuid.UUID
) -> Mandate | None:
    result = await db.execute(
        select(Mandate).where(
            Mandate.tenant_id == tenant_id, Mandate.id == mandate_id
        )
    )
    return result.scalar_one_or_none()


async def create_mandate(
    db: AsyncSession, tenant_id: uuid.UUID, data: dict
) -> Mandate:
    mandate = Mandate(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        **data,
    )
    db.add(mandate)
    await db.flush()
    return mandate


async def update_mandate(
    db: AsyncSession, tenant_id: uuid.UUID, mandate_id: uuid.UUID, data: dict
) -> Mandate | None:
    mandate = await get_mandate(db, tenant_id, mandate_id)
    if not mandate:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(mandate, key, value)
    await db.flush()
    return mandate


async def delete_mandate(
    db: AsyncSession, tenant_id: uuid.UUID, mandate_id: uuid.UUID
) -> Mandate | None:
    mandate = await get_mandate(db, tenant_id, mandate_id)
    if not mandate:
        return None
    await db.delete(mandate)
    await db.flush()
    return mandate


# --- Opportunities ---
async def list_opportunities(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pipeline_status: str | None = None,
    assigned_to: uuid.UUID | None = None,
) -> list[Opportunity]:
    stmt = select(Opportunity).where(Opportunity.tenant_id == tenant_id)
    if pipeline_status is not None:
        stmt = stmt.where(Opportunity.pipeline_status == pipeline_status)
    if assigned_to is not None:
        stmt = stmt.where(Opportunity.assigned_to == assigned_to)
    stmt = stmt.order_by(Opportunity.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_opportunity(
    db: AsyncSession, tenant_id: uuid.UUID, opp_id: uuid.UUID
) -> Opportunity | None:
    result = await db.execute(
        select(Opportunity).where(
            Opportunity.tenant_id == tenant_id, Opportunity.id == opp_id
        )
    )
    return result.scalar_one_or_none()


async def create_opportunity(
    db: AsyncSession, tenant_id: uuid.UUID, data: dict
) -> Opportunity:
    opp = Opportunity(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        **data,
    )
    db.add(opp)
    await db.flush()
    await db.refresh(opp)
    return opp


async def update_opportunity(
    db: AsyncSession, tenant_id: uuid.UUID, opp_id: uuid.UUID, data: dict
) -> Opportunity | None:
    opp = await get_opportunity(db, tenant_id, opp_id)
    if not opp:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(opp, key, value)
    await db.flush()
    await db.refresh(opp)
    return opp


async def delete_opportunity(
    db: AsyncSession, tenant_id: uuid.UUID, opp_id: uuid.UUID
) -> Opportunity | None:
    opp = await get_opportunity(db, tenant_id, opp_id)
    if not opp:
        return None
    await db.delete(opp)
    await db.flush()
    return opp


async def count_opportunities_by_status(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[tuple[str, int]]:
    result = await db.execute(
        select(Opportunity.pipeline_status, func.count())
        .where(Opportunity.tenant_id == tenant_id)
        .group_by(Opportunity.pipeline_status)
    )
    return list(result.all())


# --- Asset Managers ---
async def list_asset_managers(
    db: AsyncSession, tenant_id: uuid.UUID, type_filter: str | None = None
) -> list[AssetManager]:
    stmt = select(AssetManager).where(AssetManager.tenant_id == tenant_id)
    if type_filter is not None:
        stmt = stmt.where(AssetManager.type == type_filter)
    stmt = stmt.order_by(AssetManager.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID
) -> AssetManager | None:
    result = await db.execute(
        select(AssetManager).where(
            AssetManager.tenant_id == tenant_id, AssetManager.id == am_id
        )
    )
    return result.scalar_one_or_none()


async def create_asset_manager(
    db: AsyncSession, am: AssetManager
) -> AssetManager:
    db.add(am)
    await db.flush()
    return am


async def update_asset_manager(
    db: AsyncSession, am: AssetManager, data: dict
) -> AssetManager:
    for key, value in data.items():
        if value is not None:
            setattr(am, key, value)
    await db.flush()
    return am


async def delete_asset_manager(
    db: AsyncSession, am: AssetManager
) -> AssetManager:
    await db.delete(am)
    await db.flush()
    return am


# --- News ---
async def list_news_items(
    db: AsyncSession, tenant_id: uuid.UUID, category: str | None = None, limit: int = 50
) -> list[NewsItem]:
    stmt = select(NewsItem).where(NewsItem.tenant_id == tenant_id)
    if category is not None:
        stmt = stmt.where(NewsItem.category == category)
    stmt = stmt.order_by(NewsItem.generated_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# --- Dashboard helpers ---
async def get_mandate_allocation_summaries(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[tuple]:
    """Get active mandates with opportunity counts."""
    result = await db.execute(
        select(
            Mandate.id,
            Mandate.name,
            Mandate.target_allocation,
            func.count(Opportunity.id),
        )
        .outerjoin(
            Opportunity,
            (Opportunity.tenant_id == Mandate.tenant_id)
            & (Opportunity.pipeline_status != "rejected"),
        )
        .where(Mandate.tenant_id == tenant_id, Mandate.status == "active")
        .group_by(Mandate.id, Mandate.name, Mandate.target_allocation)
    )
    return list(result.all())


# --- Documents ---
async def list_documents(
    db: AsyncSession, tenant_id: uuid.UUID, opportunity_id: uuid.UUID
) -> list[Document]:
    result = await db.execute(
        select(Document)
        .where(Document.tenant_id == tenant_id, Document.opportunity_id == opportunity_id)
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


async def get_document(
    db: AsyncSession, tenant_id: uuid.UUID, doc_id: uuid.UUID
) -> Document | None:
    result = await db.execute(
        select(Document).where(
            Document.tenant_id == tenant_id, Document.id == doc_id
        )
    )
    return result.scalar_one_or_none()


async def create_document(
    db: AsyncSession, doc: Document
) -> Document:
    db.add(doc)
    await db.flush()
    return doc


async def update_document(
    db: AsyncSession, doc: Document, data: dict
) -> Document:
    for key, value in data.items():
        if value is not None:
            setattr(doc, key, value)
    await db.flush()
    return doc


async def delete_document(
    db: AsyncSession, doc: Document
) -> Document:
    await db.delete(doc)
    await db.flush()
    return doc


# --- Document Reviews ---
async def list_reviews(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    reviewer_id: uuid.UUID | None = None,
    requested_by: uuid.UUID | None = None,
    status: str | None = None,
) -> list[DocumentReview]:
    stmt = select(DocumentReview).where(DocumentReview.tenant_id == tenant_id)
    if reviewer_id is not None:
        stmt = stmt.where(DocumentReview.reviewer_id == reviewer_id)
    if requested_by is not None:
        stmt = stmt.where(DocumentReview.requested_by == requested_by)
    if status is not None:
        stmt = stmt.where(DocumentReview.status == status)
    stmt = stmt.order_by(DocumentReview.requested_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_review(
    db: AsyncSession, tenant_id: uuid.UUID, review_id: uuid.UUID
) -> DocumentReview | None:
    result = await db.execute(
        select(DocumentReview).where(
            DocumentReview.tenant_id == tenant_id, DocumentReview.id == review_id
        )
    )
    return result.scalar_one_or_none()


async def create_review(
    db: AsyncSession, review: DocumentReview, document_ids: list[uuid.UUID]
) -> DocumentReview:
    db.add(review)
    await db.flush()
    for doc_id in document_ids:
        item = DocumentReviewItem(
            id=uuid.uuid4(),
            review_id=review.id,
            document_id=doc_id,
        )
        db.add(item)
    await db.flush()
    await db.refresh(review)
    return review


async def update_review(
    db: AsyncSession, review: DocumentReview, data: dict
) -> DocumentReview:
    for key, value in data.items():
        if value is not None:
            setattr(review, key, value)
    await db.flush()
    return review


# --- Document Shares ---
async def list_shares(
    db: AsyncSession, tenant_id: uuid.UUID, document_id: uuid.UUID
) -> list[DocumentShare]:
    result = await db.execute(
        select(DocumentShare)
        .where(DocumentShare.tenant_id == tenant_id, DocumentShare.document_id == document_id)
        .order_by(DocumentShare.created_at.desc())
    )
    return list(result.scalars().all())


async def create_share(
    db: AsyncSession, share: DocumentShare
) -> DocumentShare:
    db.add(share)
    await db.flush()
    return share


async def get_share(
    db: AsyncSession, tenant_id: uuid.UUID, share_id: uuid.UUID
) -> DocumentShare | None:
    result = await db.execute(
        select(DocumentShare).where(
            DocumentShare.tenant_id == tenant_id, DocumentShare.id == share_id
        )
    )
    return result.scalar_one_or_none()


async def delete_share(
    db: AsyncSession, share: DocumentShare
) -> DocumentShare:
    await db.delete(share)
    await db.flush()
    return share


# --- Source Files ---
async def list_source_files(
    db: AsyncSession, tenant_id: uuid.UUID, opportunity_id: uuid.UUID
) -> list[SourceFile]:
    result = await db.execute(
        select(SourceFile)
        .where(SourceFile.tenant_id == tenant_id, SourceFile.opportunity_id == opportunity_id)
        .order_by(SourceFile.created_at.desc())
    )
    return list(result.scalars().all())


# --- Email Accounts ---
async def list_email_accounts(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[EmailAccount]:
    result = await db.execute(
        select(EmailAccount)
        .where(EmailAccount.tenant_id == tenant_id)
        .order_by(EmailAccount.created_at)
    )
    return list(result.scalars().all())


async def get_email_account(
    db: AsyncSession, tenant_id: uuid.UUID, account_id: uuid.UUID
) -> EmailAccount | None:
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.tenant_id == tenant_id, EmailAccount.id == account_id
        )
    )
    return result.scalar_one_or_none()


async def create_email_account(
    db: AsyncSession, account: EmailAccount
) -> EmailAccount:
    db.add(account)
    await db.flush()
    return account


async def delete_email_account(
    db: AsyncSession, account: EmailAccount
) -> EmailAccount:
    await db.delete(account)
    await db.flush()
    return account


# --- Synced Emails ---
async def list_emails(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    account_id: uuid.UUID | None = None,
    import_status: str | None = None,
    has_attachments: bool | None = None,
    search: str | None = None,
) -> list[SyncedEmail]:
    stmt = select(SyncedEmail).where(SyncedEmail.tenant_id == tenant_id)
    if account_id is not None:
        stmt = stmt.where(SyncedEmail.email_account_id == account_id)
    if import_status is not None:
        stmt = stmt.where(SyncedEmail.import_status == import_status)
    if has_attachments is True:
        stmt = stmt.where(SyncedEmail.attachment_count > 0)
    elif has_attachments is False:
        stmt = stmt.where(SyncedEmail.attachment_count == 0)
    if search is not None:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                SyncedEmail.subject.ilike(pattern),
                SyncedEmail.from_name.ilike(pattern),
                SyncedEmail.from_address.ilike(pattern),
            )
        )
    stmt = stmt.order_by(SyncedEmail.received_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_email(
    db: AsyncSession, tenant_id: uuid.UUID, email_id: uuid.UUID
) -> SyncedEmail | None:
    result = await db.execute(
        select(SyncedEmail).where(
            SyncedEmail.tenant_id == tenant_id, SyncedEmail.id == email_id
        )
    )
    return result.scalar_one_or_none()


async def update_email(
    db: AsyncSession, email: SyncedEmail, data: dict
) -> SyncedEmail:
    for key, value in data.items():
        if value is not None:
            setattr(email, key, value)
    await db.flush()
    return email


# --- Google Drive Accounts ---
async def list_google_drive_accounts(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[GoogleDriveAccount]:
    result = await db.execute(
        select(GoogleDriveAccount)
        .where(GoogleDriveAccount.tenant_id == tenant_id)
        .order_by(GoogleDriveAccount.created_at)
    )
    return list(result.scalars().all())


async def get_google_drive_account(
    db: AsyncSession, tenant_id: uuid.UUID, account_id: uuid.UUID
) -> GoogleDriveAccount | None:
    result = await db.execute(
        select(GoogleDriveAccount).where(
            GoogleDriveAccount.tenant_id == tenant_id, GoogleDriveAccount.id == account_id
        )
    )
    return result.scalar_one_or_none()


async def create_google_drive_account(
    db: AsyncSession, account: GoogleDriveAccount
) -> GoogleDriveAccount:
    db.add(account)
    await db.flush()
    return account


async def delete_google_drive_account(
    db: AsyncSession, account: GoogleDriveAccount
) -> GoogleDriveAccount:
    await db.delete(account)
    await db.flush()
    return account


# --- Google Drive Import Jobs ---
async def create_import_job(
    db: AsyncSession, job: GoogleDriveImportJob
) -> GoogleDriveImportJob:
    db.add(job)
    await db.flush()
    return job


async def get_import_job(
    db: AsyncSession, tenant_id: uuid.UUID, job_id: uuid.UUID
) -> GoogleDriveImportJob | None:
    result = await db.execute(
        select(GoogleDriveImportJob).where(
            GoogleDriveImportJob.tenant_id == tenant_id, GoogleDriveImportJob.id == job_id
        )
    )
    return result.scalar_one_or_none()
