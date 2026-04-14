import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timezone

from app.modules.deals import repository
from app.modules.deals.models import (
    AssetManager,
    Document,
    DocumentReview,
    DocumentShare,
    EmailAccount,
    GoogleDriveAccount,
    GoogleDriveImportJob,
    Opportunity,
)
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
    DocumentUpdate,
    DriveBrowseResponse,
    DriveFolder,
    EmailAccountCreate,
    EmailAccountResponse,
    EmailAttachmentResponse,
    GoogleDriveAccountCreate,
    GoogleDriveAccountResponse,
    GoogleDriveImportJobResponse,
    GoogleDriveImportRequest,
    ImportEmailRequest,
    InvestmentTypeCreate,
    InvestmentTypeResponse,
    InvestmentTypeUpdate,
    DocumentTemplateUpdate,
    MandateAllocationSummary,
    MandateCreate,
    MandateResponse,
    MandateUpdate,
    NewsItemResponse,
    OpportunityCreate,
    OpportunityResponse,
    OpportunityUpdate,
    PipelineStatusCount,
    ReviewDocumentItem,
    SourceFileResponse,
    SyncedEmailResponse,
)
from app.shared.exceptions import forbidden, not_found


# --- Helpers ---
def _investment_type_to_response(inv_type) -> InvestmentTypeResponse:
    return InvestmentTypeResponse(
        id=inv_type.id,
        name=inv_type.name,
        slug=inv_type.slug,
        isSystem=inv_type.is_system,
        sortOrder=inv_type.sort_order,
        snapshotConfig=inv_type.snapshot_config,
        createdAt=inv_type.created_at,
        updatedAt=inv_type.updated_at,
    )


def _template_to_response(template) -> DocumentTemplateResponse:
    return DocumentTemplateResponse(
        id=template.id,
        investmentTypeId=template.investment_type_id,
        name=template.name,
        slug=template.slug,
        promptTemplate=template.prompt_template,
        isSystem=template.is_system,
        sortOrder=template.sort_order,
        createdAt=template.created_at,
        updatedAt=template.updated_at,
    )


def _mandate_to_response(mandate) -> MandateResponse:
    return MandateResponse(
        id=mandate.id,
        name=mandate.name,
        status=mandate.status,
        targetAllocation=float(mandate.target_allocation) if mandate.target_allocation is not None else None,
        expectedReturn=mandate.expected_return,
        timeHorizon=mandate.time_horizon,
        investmentTypes=mandate.investment_types,
        assetAllocation=mandate.asset_allocation,
        targetSectors=mandate.target_sectors,
        geographicFocus=mandate.geographic_focus,
        investmentCriteria=mandate.investment_criteria,
        investmentConstraints=mandate.investment_constraints,
        investmentStrategy=mandate.investment_strategy,
        createdBy=mandate.created_by,
        createdAt=mandate.created_at,
        updatedAt=mandate.updated_at,
    )


def _opportunity_to_response(opp) -> OpportunityResponse:
    return OpportunityResponse(
        id=opp.id,
        name=opp.name,
        investmentTypeId=opp.investment_type_id,
        investmentTypeName=opp.investment_type.name if opp.investment_type else None,
        pipelineStatus=opp.pipeline_status,
        assetManagerId=opp.asset_manager_id,
        assetManagerName=opp.asset_manager.name if opp.asset_manager else None,
        assignedTo=opp.assigned_to,
        snapshotData=opp.snapshot_data,
        snapshotCitations=opp.snapshot_citations,
        sourceType=opp.source_type,
        mandateFits=opp.mandate_fits,
        createdBy=opp.created_by,
        createdAt=opp.created_at,
        updatedAt=opp.updated_at,
    )


# --- Investment Types ---
async def list_investment_types(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[InvestmentTypeResponse]:
    types = await repository.list_investment_types(db, tenant_id)
    return [_investment_type_to_response(t) for t in types]


async def get_investment_type(
    db: AsyncSession, tenant_id: uuid.UUID, type_id: uuid.UUID
) -> InvestmentTypeResponse:
    inv_type = await repository.get_investment_type(db, tenant_id, type_id)
    if not inv_type:
        raise not_found("Investment type not found")
    return _investment_type_to_response(inv_type)


async def create_investment_type(
    db: AsyncSession, tenant_id: uuid.UUID, data: InvestmentTypeCreate
) -> InvestmentTypeResponse:
    create_data = {
        "name": data.name,
        "slug": data.slug,
        "snapshot_config": data.snapshotConfig,
    }
    inv_type = await repository.create_investment_type(db, tenant_id, create_data)
    return _investment_type_to_response(inv_type)


async def update_investment_type(
    db: AsyncSession, tenant_id: uuid.UUID, type_id: uuid.UUID, data: InvestmentTypeUpdate
) -> InvestmentTypeResponse:
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.snapshotConfig is not None:
        update_data["snapshot_config"] = data.snapshotConfig
    if data.sortOrder is not None:
        update_data["sort_order"] = data.sortOrder

    inv_type = await repository.update_investment_type(db, tenant_id, type_id, update_data)
    if not inv_type:
        raise not_found("Investment type not found")
    return _investment_type_to_response(inv_type)


async def delete_investment_type(
    db: AsyncSession, tenant_id: uuid.UUID, type_id: uuid.UUID
) -> bool:
    inv_type = await repository.get_investment_type(db, tenant_id, type_id)
    if not inv_type:
        raise not_found("Investment type not found")
    if inv_type.is_system:
        raise forbidden("Cannot delete a system investment type")
    await repository.delete_investment_type(db, tenant_id, type_id)
    return True


# --- Document Templates ---
async def list_templates(
    db: AsyncSession, tenant_id: uuid.UUID, investment_type_id: uuid.UUID | None = None
) -> list[DocumentTemplateResponse]:
    templates = await repository.list_templates(db, tenant_id, investment_type_id)
    return [_template_to_response(t) for t in templates]


async def get_template(
    db: AsyncSession, tenant_id: uuid.UUID, template_id: uuid.UUID
) -> DocumentTemplateResponse:
    template = await repository.get_template(db, tenant_id, template_id)
    if not template:
        raise not_found("Document template not found")
    return _template_to_response(template)


async def update_template(
    db: AsyncSession, tenant_id: uuid.UUID, template_id: uuid.UUID, data: DocumentTemplateUpdate
) -> DocumentTemplateResponse:
    update_data = {"prompt_template": data.promptTemplate}
    template = await repository.update_template(db, tenant_id, template_id, update_data)
    if not template:
        raise not_found("Document template not found")
    return _template_to_response(template)


# --- Mandates ---
async def list_mandates(
    db: AsyncSession, tenant_id: uuid.UUID, status: str | None = None
) -> list[MandateResponse]:
    mandates = await repository.list_mandates(db, tenant_id, status)
    return [_mandate_to_response(m) for m in mandates]


async def get_mandate(
    db: AsyncSession, tenant_id: uuid.UUID, mandate_id: uuid.UUID
) -> MandateResponse:
    mandate = await repository.get_mandate(db, tenant_id, mandate_id)
    if not mandate:
        raise not_found("Mandate not found")
    return _mandate_to_response(mandate)


async def create_mandate(
    db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID, data: MandateCreate
) -> MandateResponse:
    create_data: dict = {"name": data.name, "created_by": user_id}
    if data.status is not None:
        create_data["status"] = data.status
    if data.targetAllocation is not None:
        create_data["target_allocation"] = data.targetAllocation
    if data.expectedReturn is not None:
        create_data["expected_return"] = data.expectedReturn
    if data.timeHorizon is not None:
        create_data["time_horizon"] = data.timeHorizon
    if data.investmentTypes is not None:
        create_data["investment_types"] = data.investmentTypes
    if data.assetAllocation is not None:
        create_data["asset_allocation"] = data.assetAllocation
    if data.targetSectors is not None:
        create_data["target_sectors"] = data.targetSectors
    if data.geographicFocus is not None:
        create_data["geographic_focus"] = data.geographicFocus
    if data.investmentCriteria is not None:
        create_data["investment_criteria"] = data.investmentCriteria
    if data.investmentConstraints is not None:
        create_data["investment_constraints"] = data.investmentConstraints
    if data.investmentStrategy is not None:
        create_data["investment_strategy"] = data.investmentStrategy

    mandate = await repository.create_mandate(db, tenant_id, create_data)
    return _mandate_to_response(mandate)


async def update_mandate(
    db: AsyncSession, tenant_id: uuid.UUID, mandate_id: uuid.UUID, data: MandateUpdate
) -> MandateResponse:
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.status is not None:
        update_data["status"] = data.status
    if data.targetAllocation is not None:
        update_data["target_allocation"] = data.targetAllocation
    if data.expectedReturn is not None:
        update_data["expected_return"] = data.expectedReturn
    if data.timeHorizon is not None:
        update_data["time_horizon"] = data.timeHorizon
    if data.investmentTypes is not None:
        update_data["investment_types"] = data.investmentTypes
    if data.assetAllocation is not None:
        update_data["asset_allocation"] = data.assetAllocation
    if data.targetSectors is not None:
        update_data["target_sectors"] = data.targetSectors
    if data.geographicFocus is not None:
        update_data["geographic_focus"] = data.geographicFocus
    if data.investmentCriteria is not None:
        update_data["investment_criteria"] = data.investmentCriteria
    if data.investmentConstraints is not None:
        update_data["investment_constraints"] = data.investmentConstraints
    if data.investmentStrategy is not None:
        update_data["investment_strategy"] = data.investmentStrategy

    mandate = await repository.update_mandate(db, tenant_id, mandate_id, update_data)
    if not mandate:
        raise not_found("Mandate not found")
    return _mandate_to_response(mandate)


async def delete_mandate(
    db: AsyncSession, tenant_id: uuid.UUID, mandate_id: uuid.UUID
) -> bool:
    mandate = await repository.delete_mandate(db, tenant_id, mandate_id)
    if not mandate:
        raise not_found("Mandate not found")
    return True


# --- Opportunities ---
async def list_opportunities(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pipeline_status: str | None = None,
    assigned_to: uuid.UUID | None = None,
) -> list[OpportunityResponse]:
    opps = await repository.list_opportunities(db, tenant_id, pipeline_status, assigned_to)
    return [_opportunity_to_response(o) for o in opps]


async def get_opportunity(
    db: AsyncSession, tenant_id: uuid.UUID, opp_id: uuid.UUID
) -> OpportunityResponse:
    opp = await repository.get_opportunity(db, tenant_id, opp_id)
    if not opp:
        raise not_found("Opportunity not found")
    return _opportunity_to_response(opp)


async def create_opportunity(
    db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID, data: OpportunityCreate
) -> OpportunityResponse:
    create_data: dict = {"name": data.name, "created_by": user_id}
    if data.investmentTypeId is not None:
        create_data["investment_type_id"] = data.investmentTypeId
    if data.assetManagerId is not None:
        create_data["asset_manager_id"] = data.assetManagerId
    if data.snapshotData is not None:
        create_data["snapshot_data"] = data.snapshotData
    if data.sourceType is not None:
        create_data["source_type"] = data.sourceType

    opp = await repository.create_opportunity(db, tenant_id, create_data)
    return _opportunity_to_response(opp)


async def update_opportunity(
    db: AsyncSession, tenant_id: uuid.UUID, opp_id: uuid.UUID, data: OpportunityUpdate
) -> OpportunityResponse:
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.investmentTypeId is not None:
        update_data["investment_type_id"] = data.investmentTypeId
    if data.pipelineStatus is not None:
        update_data["pipeline_status"] = data.pipelineStatus
    if data.assetManagerId is not None:
        update_data["asset_manager_id"] = data.assetManagerId
    if data.assignedTo is not None:
        update_data["assigned_to"] = data.assignedTo
    if data.snapshotData is not None:
        update_data["snapshot_data"] = data.snapshotData

    opp = await repository.update_opportunity(db, tenant_id, opp_id, update_data)
    if not opp:
        raise not_found("Opportunity not found")
    return _opportunity_to_response(opp)


async def delete_opportunity(
    db: AsyncSession, tenant_id: uuid.UUID, opp_id: uuid.UUID
) -> bool:
    opp = await repository.delete_opportunity(db, tenant_id, opp_id)
    if not opp:
        raise not_found("Opportunity not found")
    return True


# --- Asset Manager helpers ---
def _asset_manager_to_response(am) -> AssetManagerResponse:
    return AssetManagerResponse(
        id=am.id,
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


def _news_item_to_response(item) -> NewsItemResponse:
    return NewsItemResponse(
        id=item.id,
        headline=item.headline,
        summary=item.summary,
        fullContent=item.full_content,
        category=item.category,
        sourceUrl=item.source_url,
        linkedOpportunityIds=[str(link.opportunity_id) for link in item.opportunity_links],
        generatedAt=item.generated_at,
        createdAt=item.created_at,
    )


# --- Asset Managers ---
async def list_asset_managers(
    db: AsyncSession, tenant_id: uuid.UUID, type_filter: str | None = None
) -> list[AssetManagerResponse]:
    managers = await repository.list_asset_managers(db, tenant_id, type_filter)
    return [_asset_manager_to_response(m) for m in managers]


async def get_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID
) -> AssetManagerResponse:
    am = await repository.get_asset_manager(db, tenant_id, am_id)
    if not am:
        raise not_found("Asset manager not found")
    return _asset_manager_to_response(am)


async def create_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, data: AssetManagerCreate
) -> AssetManagerResponse:
    am = AssetManager(
        id=uuid.uuid4(),
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
    am = await repository.create_asset_manager(db, am)
    return _asset_manager_to_response(am)


async def update_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID, data: AssetManagerUpdate
) -> AssetManagerResponse:
    am = await repository.get_asset_manager(db, tenant_id, am_id)
    if not am:
        raise not_found("Asset manager not found")
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.type is not None:
        update_data["type"] = data.type
    if data.location is not None:
        update_data["location"] = data.location
    if data.description is not None:
        update_data["description"] = data.description
    if data.fundInfo is not None:
        update_data["fund_info"] = data.fundInfo
    if data.firmInfo is not None:
        update_data["firm_info"] = data.firmInfo
    if data.strategy is not None:
        update_data["strategy"] = data.strategy
    if data.characteristics is not None:
        update_data["characteristics"] = data.characteristics

    am = await repository.update_asset_manager(db, am, update_data)
    return _asset_manager_to_response(am)


async def delete_asset_manager(
    db: AsyncSession, tenant_id: uuid.UUID, am_id: uuid.UUID
) -> bool:
    am = await repository.get_asset_manager(db, tenant_id, am_id)
    if not am:
        raise not_found("Asset manager not found")
    await repository.delete_asset_manager(db, am)
    return True


# --- News ---
async def list_news_items(
    db: AsyncSession, tenant_id: uuid.UUID, category: str | None = None
) -> list[NewsItemResponse]:
    items = await repository.list_news_items(db, tenant_id, category)
    return [_news_item_to_response(item) for item in items]


# --- Dashboard ---
async def get_dashboard_summary(
    db: AsyncSession, tenant_id: uuid.UUID
) -> DashboardSummaryResponse:
    status_counts = await repository.count_opportunities_by_status(db, tenant_id)
    pipeline_counts = [
        PipelineStatusCount(status=status, count=count) for status, count in status_counts
    ]
    total_opportunities = sum(pc.count for pc in pipeline_counts)

    mandate_rows = await repository.get_mandate_allocation_summaries(db, tenant_id)
    mandate_allocations = [
        MandateAllocationSummary(
            mandateId=row[0],
            mandateName=row[1],
            targetAllocation=float(row[2]) if row[2] is not None else None,
            currentAllocation=None,
            opportunityCount=row[3],
        )
        for row in mandate_rows
    ]

    news_items = await repository.list_news_items(db, tenant_id, limit=10)
    recent_news = [_news_item_to_response(item) for item in news_items]

    return DashboardSummaryResponse(
        pipelineCounts=pipeline_counts,
        totalOpportunities=total_opportunities,
        mandateAllocations=mandate_allocations,
        recentNews=recent_news,
    )


# --- Document helpers ---
def _document_to_response(doc) -> DocumentResponse:
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


def _review_to_response(review) -> DocumentReviewResponse:
    documents = [
        ReviewDocumentItem(
            documentId=str(item.document_id),
            documentName=item.document.name,
            documentType=item.document.document_type,
        )
        for item in review.items
    ]
    return DocumentReviewResponse(
        id=str(review.id),
        reviewerId=str(review.reviewer_id),
        requestedBy=str(review.requested_by),
        status=review.status,
        rationale=review.rationale,
        rationaleGenerated=review.rationale_generated,
        requestedAt=review.requested_at,
        reviewedAt=review.reviewed_at,
        documents=documents,
    )


def _share_to_response(share) -> DocumentShareResponse:
    return DocumentShareResponse(
        id=str(share.id),
        documentId=str(share.document_id),
        sharedWith=str(share.shared_with),
        sharedBy=str(share.shared_by),
        permission=share.permission,
        createdAt=share.created_at,
    )


def _source_file_to_response(sf) -> SourceFileResponse:
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


# --- Documents ---
async def list_documents(
    db: AsyncSession, tenant_id: uuid.UUID, opportunity_id: uuid.UUID
) -> list[DocumentResponse]:
    docs = await repository.list_documents(db, tenant_id, opportunity_id)
    return [_document_to_response(d) for d in docs]


async def get_document(
    db: AsyncSession, tenant_id: uuid.UUID, doc_id: uuid.UUID
) -> DocumentResponse:
    doc = await repository.get_document(db, tenant_id, doc_id)
    if not doc:
        raise not_found("Document not found")
    return _document_to_response(doc)


async def create_document(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    opportunity_id: uuid.UUID,
    user_id: uuid.UUID,
    data: DocumentCreate,
) -> DocumentResponse:
    doc = Document(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        opportunity_id=opportunity_id,
        name=data.name,
        document_type=data.documentType,
        template_id=uuid.UUID(data.templateId) if data.templateId else None,
        content=data.content,
        created_by=user_id,
    )
    doc = await repository.create_document(db, doc)
    return _document_to_response(doc)


async def update_document(
    db: AsyncSession, tenant_id: uuid.UUID, doc_id: uuid.UUID, data: DocumentUpdate
) -> DocumentResponse:
    doc = await repository.get_document(db, tenant_id, doc_id)
    if not doc:
        raise not_found("Document not found")
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.content is not None:
        update_data["content"] = data.content
    if data.status is not None:
        update_data["status"] = data.status
    doc = await repository.update_document(db, doc, update_data)
    return _document_to_response(doc)


async def delete_document(
    db: AsyncSession, tenant_id: uuid.UUID, doc_id: uuid.UUID
) -> bool:
    doc = await repository.get_document(db, tenant_id, doc_id)
    if not doc:
        raise not_found("Document not found")
    await repository.delete_document(db, doc)
    return True


# --- Document Reviews ---
async def list_reviews(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    reviewer_id: uuid.UUID | None = None,
    requested_by: uuid.UUID | None = None,
    status: str | None = None,
) -> list[DocumentReviewResponse]:
    reviews = await repository.list_reviews(db, tenant_id, reviewer_id, requested_by, status)
    return [_review_to_response(r) for r in reviews]


async def get_review(
    db: AsyncSession, tenant_id: uuid.UUID, review_id: uuid.UUID
) -> DocumentReviewResponse:
    review = await repository.get_review(db, tenant_id, review_id)
    if not review:
        raise not_found("Document review not found")
    return _review_to_response(review)


async def create_review(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    data: DocumentReviewCreate,
) -> DocumentReviewResponse:
    document_ids = [uuid.UUID(did) for did in data.documentIds]

    # Update document statuses to in_review
    for doc_id in document_ids:
        doc = await repository.get_document(db, tenant_id, doc_id)
        if not doc:
            raise not_found(f"Document {doc_id} not found")
        await repository.update_document(db, doc, {"status": "in_review"})

    review = DocumentReview(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        reviewer_id=uuid.UUID(data.reviewerId),
        requested_by=user_id,
    )
    review = await repository.create_review(db, review, document_ids)
    return _review_to_response(review)


async def update_review(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    review_id: uuid.UUID,
    data: DocumentReviewUpdate,
) -> DocumentReviewResponse:
    review = await repository.get_review(db, tenant_id, review_id)
    if not review:
        raise not_found("Document review not found")

    update_data: dict = {
        "status": data.status,
        "reviewed_at": datetime.now(timezone.utc),
    }
    if data.rationale is not None:
        update_data["rationale"] = data.rationale

    # Update document statuses based on review outcome
    new_doc_status = "approved" if data.status == "approved" else "draft"
    for item in review.items:
        doc = await repository.get_document(db, tenant_id, item.document_id)
        if doc:
            await repository.update_document(db, doc, {"status": new_doc_status})

    review = await repository.update_review(db, review, update_data)
    return _review_to_response(review)


# --- Document Shares ---
async def list_shares(
    db: AsyncSession, tenant_id: uuid.UUID, document_id: uuid.UUID
) -> list[DocumentShareResponse]:
    shares = await repository.list_shares(db, tenant_id, document_id)
    return [_share_to_response(s) for s in shares]


async def create_shares(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    document_id: uuid.UUID,
    user_id: uuid.UUID,
    data: DocumentShareCreate,
) -> list[DocumentShareResponse]:
    # Verify document exists
    doc = await repository.get_document(db, tenant_id, document_id)
    if not doc:
        raise not_found("Document not found")

    shares = []
    for shared_with_id in data.sharedWith:
        share = DocumentShare(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            document_id=document_id,
            shared_with=uuid.UUID(shared_with_id),
            shared_by=user_id,
            permission=data.permission,
        )
        share = await repository.create_share(db, share)
        shares.append(share)
    return [_share_to_response(s) for s in shares]


async def delete_share(
    db: AsyncSession, tenant_id: uuid.UUID, share_id: uuid.UUID
) -> bool:
    share = await repository.get_share(db, tenant_id, share_id)
    if not share:
        raise not_found("Document share not found")
    await repository.delete_share(db, share)
    return True


# --- Source Files ---
async def list_source_files(
    db: AsyncSession, tenant_id: uuid.UUID, opportunity_id: uuid.UUID
) -> list[SourceFileResponse]:
    files = await repository.list_source_files(db, tenant_id, opportunity_id)
    return [_source_file_to_response(f) for f in files]


# --- Email helpers ---
def _email_account_to_response(account) -> EmailAccountResponse:
    return EmailAccountResponse(
        id=account.id,
        userId=account.user_id,
        provider=account.provider,
        emailAddress=account.email_address,
        status=account.status,
        lastSyncedAt=account.last_synced_at,
        syncLabels=account.sync_labels,
        createdAt=account.created_at,
        updatedAt=account.updated_at,
    )


def _email_to_response(email) -> SyncedEmailResponse:
    attachments = [
        EmailAttachmentResponse(
            id=att.id,
            fileName=att.file_name,
            fileType=att.file_type,
            fileSize=att.file_size,
        )
        for att in email.attachments
    ]
    return SyncedEmailResponse(
        id=email.id,
        emailAccountId=email.email_account_id,
        fromAddress=email.from_address,
        fromName=email.from_name,
        subject=email.subject,
        bodyText=email.body_text,
        bodyHtml=email.body_html,
        receivedAt=email.received_at,
        attachmentCount=email.attachment_count,
        importStatus=email.import_status,
        opportunityId=email.opportunity_id,
        attachments=attachments,
        createdAt=email.created_at,
    )


def _gdrive_account_to_response(account) -> GoogleDriveAccountResponse:
    return GoogleDriveAccountResponse(
        id=account.id,
        userId=account.user_id,
        emailAddress=account.email_address,
        status=account.status,
        createdAt=account.created_at,
        updatedAt=account.updated_at,
    )


def _import_job_to_response(job) -> GoogleDriveImportJobResponse:
    return GoogleDriveImportJobResponse(
        id=job.id,
        accountId=job.account_id,
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


# --- Email Accounts ---
async def list_email_accounts(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[EmailAccountResponse]:
    accounts = await repository.list_email_accounts(db, tenant_id)
    return [_email_account_to_response(a) for a in accounts]


async def connect_email_account(
    db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID, data: EmailAccountCreate
) -> EmailAccountResponse:
    account = EmailAccount(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        user_id=user_id,
        provider=data.provider,
        email_address=data.emailAddress,
        access_token=data.accessToken,
        refresh_token=data.refreshToken,
        status="connected",
    )
    account = await repository.create_email_account(db, account)
    return _email_account_to_response(account)


async def disconnect_email_account(
    db: AsyncSession, tenant_id: uuid.UUID, account_id: uuid.UUID
) -> bool:
    account = await repository.get_email_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Email account not found")
    await repository.delete_email_account(db, account)
    return True


async def trigger_email_sync(
    db: AsyncSession, tenant_id: uuid.UUID, account_id: uuid.UUID
) -> EmailAccountResponse:
    account = await repository.get_email_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Email account not found")
    # Stub: just update last_synced_at
    account.last_synced_at = datetime.now(timezone.utc)
    await db.flush()
    return _email_account_to_response(account)


# --- Synced Emails ---
async def list_emails(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    account_id: uuid.UUID | None = None,
    import_status: str | None = None,
    has_attachments: bool | None = None,
    search: str | None = None,
) -> list[SyncedEmailResponse]:
    emails = await repository.list_emails(
        db, tenant_id, account_id, import_status, has_attachments, search
    )
    return [_email_to_response(e) for e in emails]


async def get_email(
    db: AsyncSession, tenant_id: uuid.UUID, email_id: uuid.UUID
) -> SyncedEmailResponse:
    email = await repository.get_email(db, tenant_id, email_id)
    if not email:
        raise not_found("Email not found")
    return _email_to_response(email)


async def import_email_as_opportunity(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    email_id: uuid.UUID,
    data: ImportEmailRequest,
) -> OpportunityResponse:
    email = await repository.get_email(db, tenant_id, email_id)
    if not email:
        raise not_found("Email not found")

    snapshot_data = {
        "fromAddress": email.from_address,
        "fromName": email.from_name,
        "subject": email.subject,
        "receivedAt": email.received_at.isoformat() if email.received_at else None,
        "attachmentCount": email.attachment_count,
    }

    opp_data: dict = {
        "name": email.subject or "Imported Email Opportunity",
        "investment_type_id": uuid.UUID(data.investmentTypeId),
        "source_type": "email",
        "source_email_id": email.id,
        "snapshot_data": snapshot_data,
        "created_by": user_id,
    }
    opp = await repository.create_opportunity(db, tenant_id, opp_data)

    await repository.update_email(
        db, email, {"import_status": "imported", "opportunity_id": opp.id}
    )

    return _opportunity_to_response(opp)


async def ignore_email(
    db: AsyncSession, tenant_id: uuid.UUID, email_id: uuid.UUID
) -> bool:
    email = await repository.get_email(db, tenant_id, email_id)
    if not email:
        raise not_found("Email not found")
    await repository.update_email(db, email, {"import_status": "ignored"})
    return True


# --- Google Drive ---
async def list_google_drive_accounts(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[GoogleDriveAccountResponse]:
    accounts = await repository.list_google_drive_accounts(db, tenant_id)
    return [_gdrive_account_to_response(a) for a in accounts]


async def connect_google_drive(
    db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID, data: GoogleDriveAccountCreate
) -> GoogleDriveAccountResponse:
    account = GoogleDriveAccount(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        user_id=user_id,
        email_address=data.emailAddress,
        access_token=data.accessToken,
        refresh_token=data.refreshToken,
        status="connected",
    )
    account = await repository.create_google_drive_account(db, account)
    return _gdrive_account_to_response(account)


async def disconnect_google_drive(
    db: AsyncSession, tenant_id: uuid.UUID, account_id: uuid.UUID
) -> bool:
    account = await repository.get_google_drive_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Google Drive account not found")
    await repository.delete_google_drive_account(db, account)
    return True


async def browse_google_drive(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    account_id: uuid.UUID,
    parent_folder_id: str | None = None,
) -> DriveBrowseResponse:
    # Verify account exists
    account = await repository.get_google_drive_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Google Drive account not found")

    # STUB: return mock folders
    mock_folders = [
        DriveFolder(id="folder-1", name="Investment Memos", path="/Investment Memos", hasChildren=True),
        DriveFolder(id="folder-2", name="Due Diligence", path="/Due Diligence", hasChildren=True),
        DriveFolder(id="folder-3", name="Term Sheets", path="/Term Sheets", hasChildren=False),
    ]
    return DriveBrowseResponse(folders=mock_folders)


async def start_google_drive_import(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    data: GoogleDriveImportRequest,
) -> GoogleDriveImportJobResponse:
    account = await repository.get_google_drive_account(db, tenant_id, account_id)
    if not account:
        raise not_found("Google Drive account not found")

    job = GoogleDriveImportJob(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        account_id=account_id,
        folder_paths=data.folderIds,
        status="processing",
        started_at=datetime.now(timezone.utc),
        created_by=user_id,
    )
    job = await repository.create_import_job(db, job)
    return _import_job_to_response(job)


async def get_import_job(
    db: AsyncSession, tenant_id: uuid.UUID, job_id: uuid.UUID
) -> GoogleDriveImportJobResponse:
    job = await repository.get_import_job(db, tenant_id, job_id)
    if not job:
        raise not_found("Import job not found")
    return _import_job_to_response(job)
