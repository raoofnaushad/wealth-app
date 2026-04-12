import uuid

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.deals import service
from app.modules.deals.schemas import (
    DocumentTemplateResponse,
    DocumentTemplateUpdate,
    InvestmentTypeCreate,
    InvestmentTypeResponse,
    InvestmentTypeUpdate,
    MandateCreate,
    MandateResponse,
    MandateUpdate,
    OpportunityCreate,
    OpportunityResponse,
    OpportunityUpdate,
)
from app.shared.dependencies import CurrentUser, get_db_with_tenant, require_role
from app.shared.schemas import SuccessResponse

router = APIRouter(prefix="/api/v1/deals", tags=["Deals"])

# Dependency shortcuts
DealsRead = Depends(require_role("deals", ["owner", "manager", "analyst"]))
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
