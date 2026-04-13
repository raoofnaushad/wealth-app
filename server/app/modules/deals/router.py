import uuid

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.deals import service
from app.modules.deals.schemas import (
    AssetManagerCreate,
    AssetManagerResponse,
    AssetManagerUpdate,
    DashboardSummaryResponse,
    DocumentCreate,
    DocumentResponse,
    DocumentReviewCreate,
    DocumentReviewResponse,
    DocumentReviewUpdate,
    DocumentShareCreate,
    DocumentShareResponse,
    DocumentTemplateResponse,
    DocumentTemplateUpdate,
    DocumentUpdate,
    DriveBrowseResponse,
    EmailAccountCreate,
    EmailAccountResponse,
    GoogleDriveAccountCreate,
    GoogleDriveAccountResponse,
    GoogleDriveImportJobResponse,
    GoogleDriveImportRequest,
    ImportEmailRequest,
    InvestmentTypeCreate,
    InvestmentTypeResponse,
    InvestmentTypeUpdate,
    MandateCreate,
    MandateResponse,
    MandateUpdate,
    NewsItemResponse,
    OpportunityCreate,
    OpportunityResponse,
    OpportunityUpdate,
    SourceFileResponse,
    SyncedEmailResponse,
)
from app.shared.dependencies import CurrentUser, get_db_with_tenant, require_role
from app.shared.schemas import SuccessResponse

router = APIRouter(prefix="/api/v1/deals", tags=["Deals"])

# Dependency shortcuts
DealsRead = Depends(require_role("deals", ["owner", "manager", "analyst"]))
DealsManager = Depends(require_role("deals", ["owner", "manager"]))
DealsOwner = Depends(require_role("deals", ["owner"]))


# --- Investment Types ---
@router.get(
    "/settings/investment-types",
    response_model=SuccessResponse[list[InvestmentTypeResponse]],
)
async def list_investment_types(
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_investment_types(db, user.tenant_id)
    return SuccessResponse(data=data)


@router.post(
    "/settings/investment-types",
    response_model=SuccessResponse[InvestmentTypeResponse],
    status_code=201,
)
async def create_investment_type(
    body: InvestmentTypeCreate,
    user: CurrentUser = DealsOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_investment_type(db, user.tenant_id, body)
    return SuccessResponse(data=data)


@router.get(
    "/settings/investment-types/{type_id}",
    response_model=SuccessResponse[InvestmentTypeResponse],
)
async def get_investment_type(
    type_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_investment_type(db, user.tenant_id, type_id)
    return SuccessResponse(data=data)


@router.put(
    "/settings/investment-types/{type_id}",
    response_model=SuccessResponse[InvestmentTypeResponse],
)
async def update_investment_type(
    type_id: uuid.UUID,
    body: InvestmentTypeUpdate,
    user: CurrentUser = DealsOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_investment_type(db, user.tenant_id, type_id, body)
    return SuccessResponse(data=data)


@router.delete("/settings/investment-types/{type_id}", status_code=204)
async def delete_investment_type(
    type_id: uuid.UUID,
    user: CurrentUser = DealsOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.delete_investment_type(db, user.tenant_id, type_id)
    return Response(status_code=204)


# --- Document Templates ---
@router.get(
    "/settings/templates",
    response_model=SuccessResponse[list[DocumentTemplateResponse]],
)
async def list_templates(
    investment_type_id: uuid.UUID | None = Query(None, alias="investmentTypeId"),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_templates(db, user.tenant_id, investment_type_id)
    return SuccessResponse(data=data)


@router.get(
    "/settings/templates/{template_id}",
    response_model=SuccessResponse[DocumentTemplateResponse],
)
async def get_template(
    template_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_template(db, user.tenant_id, template_id)
    return SuccessResponse(data=data)


@router.put(
    "/settings/templates/{template_id}",
    response_model=SuccessResponse[DocumentTemplateResponse],
)
async def update_template(
    template_id: uuid.UUID,
    body: DocumentTemplateUpdate,
    user: CurrentUser = DealsOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_template(db, user.tenant_id, template_id, body)
    return SuccessResponse(data=data)


# --- Mandates ---
@router.get("/mandates", response_model=SuccessResponse[list[MandateResponse]])
async def list_mandates(
    status: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_mandates(db, user.tenant_id, status)
    return SuccessResponse(data=data)


@router.post(
    "/mandates",
    response_model=SuccessResponse[MandateResponse],
    status_code=201,
)
async def create_mandate(
    body: MandateCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_mandate(db, user.tenant_id, user.id, body)
    return SuccessResponse(data=data)


@router.get("/mandates/{mandate_id}", response_model=SuccessResponse[MandateResponse])
async def get_mandate(
    mandate_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_mandate(db, user.tenant_id, mandate_id)
    return SuccessResponse(data=data)


@router.put("/mandates/{mandate_id}", response_model=SuccessResponse[MandateResponse])
async def update_mandate(
    mandate_id: uuid.UUID,
    body: MandateUpdate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_mandate(db, user.tenant_id, mandate_id, body)
    return SuccessResponse(data=data)


@router.delete("/mandates/{mandate_id}", status_code=204)
async def delete_mandate(
    mandate_id: uuid.UUID,
    user: CurrentUser = DealsOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.delete_mandate(db, user.tenant_id, mandate_id)
    return Response(status_code=204)


# --- Opportunities ---
@router.get("/opportunities", response_model=SuccessResponse[list[OpportunityResponse]])
async def list_opportunities(
    pipeline_status: str | None = Query(None, alias="pipelineStatus"),
    assigned_to: uuid.UUID | None = Query(None, alias="assignedTo"),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_opportunities(db, user.tenant_id, pipeline_status, assigned_to)
    return SuccessResponse(data=data)


@router.post(
    "/opportunities",
    response_model=SuccessResponse[OpportunityResponse],
    status_code=201,
)
async def create_opportunity(
    body: OpportunityCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_opportunity(db, user.tenant_id, user.id, body)
    return SuccessResponse(data=data)


@router.get(
    "/opportunities/{opp_id}",
    response_model=SuccessResponse[OpportunityResponse],
)
async def get_opportunity(
    opp_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_opportunity(db, user.tenant_id, opp_id)
    return SuccessResponse(data=data)


@router.put(
    "/opportunities/{opp_id}",
    response_model=SuccessResponse[OpportunityResponse],
)
async def update_opportunity(
    opp_id: uuid.UUID,
    body: OpportunityUpdate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_opportunity(db, user.tenant_id, opp_id, body)
    return SuccessResponse(data=data)


@router.delete("/opportunities/{opp_id}", status_code=204)
async def delete_opportunity(
    opp_id: uuid.UUID,
    user: CurrentUser = DealsOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.delete_opportunity(db, user.tenant_id, opp_id)
    return Response(status_code=204)


# --- Asset Managers ---
@router.get("/asset-managers", response_model=SuccessResponse[list[AssetManagerResponse]])
async def list_asset_managers(
    type: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_asset_managers(db, user.tenant_id, type)
    return SuccessResponse(data=data)


@router.post(
    "/asset-managers",
    response_model=SuccessResponse[AssetManagerResponse],
    status_code=201,
)
async def create_asset_manager(
    body: AssetManagerCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_asset_manager(db, user.tenant_id, body)
    return SuccessResponse(data=data)


@router.get(
    "/asset-managers/{am_id}",
    response_model=SuccessResponse[AssetManagerResponse],
)
async def get_asset_manager(
    am_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_asset_manager(db, user.tenant_id, am_id)
    return SuccessResponse(data=data)


@router.put(
    "/asset-managers/{am_id}",
    response_model=SuccessResponse[AssetManagerResponse],
)
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


# --- News ---
@router.get("/news", response_model=SuccessResponse[list[NewsItemResponse]])
async def list_news_items(
    category: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_news_items(db, user.tenant_id, category)
    return SuccessResponse(data=data)


# --- Dashboard ---
@router.get("/dashboard/summary", response_model=SuccessResponse[DashboardSummaryResponse])
async def get_dashboard_summary(
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_dashboard_summary(db, user.tenant_id)
    return SuccessResponse(data=data)


# --- Documents ---
@router.get(
    "/opportunities/{opp_id}/documents",
    response_model=SuccessResponse[list[DocumentResponse]],
)
async def list_documents(
    opp_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_documents(db, user.tenant_id, opp_id)
    return SuccessResponse(data=data)


@router.post(
    "/opportunities/{opp_id}/documents",
    response_model=SuccessResponse[DocumentResponse],
    status_code=201,
)
async def create_document(
    opp_id: uuid.UUID,
    body: DocumentCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_document(db, user.tenant_id, opp_id, user.id, body)
    return SuccessResponse(data=data)


@router.get(
    "/opportunities/{opp_id}/documents/{doc_id}",
    response_model=SuccessResponse[DocumentResponse],
)
async def get_document(
    opp_id: uuid.UUID,
    doc_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_document(db, user.tenant_id, doc_id)
    return SuccessResponse(data=data)


@router.put(
    "/opportunities/{opp_id}/documents/{doc_id}",
    response_model=SuccessResponse[DocumentResponse],
)
async def update_document(
    opp_id: uuid.UUID,
    doc_id: uuid.UUID,
    body: DocumentUpdate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_document(db, user.tenant_id, doc_id, body)
    return SuccessResponse(data=data)


@router.delete("/opportunities/{opp_id}/documents/{doc_id}", status_code=204)
async def delete_document(
    opp_id: uuid.UUID,
    doc_id: uuid.UUID,
    user: CurrentUser = DealsOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.delete_document(db, user.tenant_id, doc_id)
    return Response(status_code=204)


# --- Source Files ---
@router.get(
    "/opportunities/{opp_id}/files",
    response_model=SuccessResponse[list[SourceFileResponse]],
)
async def list_source_files(
    opp_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_source_files(db, user.tenant_id, opp_id)
    return SuccessResponse(data=data)


# --- Document Reviews ---
@router.post(
    "/reviews",
    response_model=SuccessResponse[DocumentReviewResponse],
    status_code=201,
)
async def create_review(
    body: DocumentReviewCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_review(db, user.tenant_id, user.id, body)
    return SuccessResponse(data=data)


@router.get(
    "/reviews",
    response_model=SuccessResponse[list[DocumentReviewResponse]],
)
async def list_reviews(
    reviewer_id: uuid.UUID | None = Query(None, alias="reviewerId"),
    requested_by: uuid.UUID | None = Query(None, alias="requestedBy"),
    status: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_reviews(db, user.tenant_id, reviewer_id, requested_by, status)
    return SuccessResponse(data=data)


@router.get(
    "/reviews/{review_id}",
    response_model=SuccessResponse[DocumentReviewResponse],
)
async def get_review(
    review_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_review(db, user.tenant_id, review_id)
    return SuccessResponse(data=data)


@router.put(
    "/reviews/{review_id}",
    response_model=SuccessResponse[DocumentReviewResponse],
)
async def update_review(
    review_id: uuid.UUID,
    body: DocumentReviewUpdate,
    user: CurrentUser = DealsManager,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_review(db, user.tenant_id, review_id, body)
    return SuccessResponse(data=data)


# --- Document Shares ---
@router.post(
    "/documents/{doc_id}/share",
    response_model=SuccessResponse[list[DocumentShareResponse]],
    status_code=201,
)
async def create_shares(
    doc_id: uuid.UUID,
    body: DocumentShareCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_shares(db, user.tenant_id, doc_id, user.id, body)
    return SuccessResponse(data=data)


@router.get(
    "/documents/{doc_id}/shares",
    response_model=SuccessResponse[list[DocumentShareResponse]],
)
async def list_shares(
    doc_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_shares(db, user.tenant_id, doc_id)
    return SuccessResponse(data=data)


@router.delete("/documents/{doc_id}/shares/{share_id}", status_code=204)
async def delete_share(
    doc_id: uuid.UUID,
    share_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.delete_share(db, user.tenant_id, share_id)
    return Response(status_code=204)


# --- Email Accounts ---
@router.get(
    "/email/accounts",
    response_model=SuccessResponse[list[EmailAccountResponse]],
)
async def list_email_accounts(
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_email_accounts(db, user.tenant_id)
    return SuccessResponse(data=data)


@router.post(
    "/email/accounts",
    response_model=SuccessResponse[EmailAccountResponse],
    status_code=201,
)
async def connect_email_account(
    body: EmailAccountCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.connect_email_account(db, user.tenant_id, user.id, body)
    return SuccessResponse(data=data)


@router.delete("/email/accounts/{account_id}", status_code=204)
async def disconnect_email_account(
    account_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.disconnect_email_account(db, user.tenant_id, account_id)
    return Response(status_code=204)


@router.post(
    "/email/accounts/{account_id}/sync",
    response_model=SuccessResponse[EmailAccountResponse],
)
async def trigger_email_sync(
    account_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.trigger_email_sync(db, user.tenant_id, account_id)
    return SuccessResponse(data=data)


# --- Synced Emails ---
@router.get(
    "/emails",
    response_model=SuccessResponse[list[SyncedEmailResponse]],
)
async def list_emails(
    account_id: uuid.UUID | None = Query(None, alias="accountId"),
    import_status: str | None = Query(None, alias="importStatus"),
    has_attachments: bool | None = Query(None, alias="hasAttachments"),
    search: str | None = Query(None),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_emails(
        db, user.tenant_id, account_id, import_status, has_attachments, search
    )
    return SuccessResponse(data=data)


@router.get(
    "/emails/{email_id}",
    response_model=SuccessResponse[SyncedEmailResponse],
)
async def get_email(
    email_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_email(db, user.tenant_id, email_id)
    return SuccessResponse(data=data)


@router.post(
    "/emails/{email_id}/import",
    response_model=SuccessResponse[OpportunityResponse],
    status_code=201,
)
async def import_email(
    email_id: uuid.UUID,
    body: ImportEmailRequest,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.import_email_as_opportunity(
        db, user.tenant_id, user.id, email_id, body
    )
    return SuccessResponse(data=data)


@router.put("/emails/{email_id}/ignore", status_code=204)
async def ignore_email(
    email_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.ignore_email(db, user.tenant_id, email_id)
    return Response(status_code=204)


# --- Google Drive ---
@router.post(
    "/integrations/google-drive",
    response_model=SuccessResponse[GoogleDriveAccountResponse],
    status_code=201,
)
async def connect_google_drive(
    body: GoogleDriveAccountCreate,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.connect_google_drive(db, user.tenant_id, user.id, body)
    return SuccessResponse(data=data)


@router.delete("/integrations/google-drive/{account_id}", status_code=204)
async def disconnect_google_drive(
    account_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.disconnect_google_drive(db, user.tenant_id, account_id)
    return Response(status_code=204)


@router.get(
    "/integrations/google-drive/browse",
    response_model=SuccessResponse[DriveBrowseResponse],
)
async def browse_google_drive(
    account_id: uuid.UUID = Query(..., alias="accountId"),
    parent_folder_id: str | None = Query(None, alias="parentFolderId"),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.browse_google_drive(
        db, user.tenant_id, account_id, parent_folder_id
    )
    return SuccessResponse(data=data)


@router.post(
    "/integrations/google-drive/import",
    response_model=SuccessResponse[GoogleDriveImportJobResponse],
    status_code=201,
)
async def start_google_drive_import(
    body: GoogleDriveImportRequest,
    account_id: uuid.UUID = Query(..., alias="accountId"),
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.start_google_drive_import(
        db, user.tenant_id, user.id, account_id, body
    )
    return SuccessResponse(data=data)


@router.get(
    "/integrations/google-drive/import/{job_id}",
    response_model=SuccessResponse[GoogleDriveImportJobResponse],
)
async def get_import_job(
    job_id: uuid.UUID,
    user: CurrentUser = DealsRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_import_job(db, user.tenant_id, job_id)
    return SuccessResponse(data=data)
