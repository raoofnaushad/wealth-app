import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin import service
from app.modules.admin.schemas import (
    BrandingResponse,
    CreateInvitationRequest,
    InvitationResponse,
    OrganizationResponse,
    PreferencesResponse,
    UpdateBrandingRequest,
    UpdateOrganizationRequest,
    UpdatePreferencesRequest,
    UpdateUserRequest,
    UserResponse,
)
from app.shared.dependencies import CurrentUser, get_db_with_tenant, require_role
from app.shared.schemas import SuccessResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# Dependency shortcuts
AdminRead = Depends(require_role("admin", ["owner", "manager", "analyst"]))
AdminWrite = Depends(require_role("admin", ["owner", "manager"]))
AdminOwner = Depends(require_role("admin", ["owner"]))


# --- Organization ---
@router.get("/organization", response_model=SuccessResponse[OrganizationResponse])
async def get_organization(
    user: CurrentUser = AdminRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_organization(db, user.tenant_id)
    return SuccessResponse(data=data)


@router.put("/organization", response_model=SuccessResponse[OrganizationResponse])
async def update_organization(
    body: UpdateOrganizationRequest,
    user: CurrentUser = AdminWrite,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_organization(db, user.tenant_id, body)
    return SuccessResponse(data=data)


# --- Branding ---
@router.get("/branding", response_model=SuccessResponse[BrandingResponse])
async def get_branding(
    user: CurrentUser = AdminRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_branding(db, user.tenant_id)
    return SuccessResponse(data=data)


@router.put("/branding", response_model=SuccessResponse[BrandingResponse])
async def update_branding(
    body: UpdateBrandingRequest,
    user: CurrentUser = AdminWrite,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_branding(db, user.tenant_id, body)
    return SuccessResponse(data=data)


# --- Preferences ---
@router.get("/preferences", response_model=SuccessResponse[PreferencesResponse])
async def get_preferences(
    user: CurrentUser = AdminRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_preferences(db, user.tenant_id)
    return SuccessResponse(data=data)


@router.put("/preferences", response_model=SuccessResponse[PreferencesResponse])
async def update_preferences(
    body: UpdatePreferencesRequest,
    user: CurrentUser = AdminWrite,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_preferences(db, user.tenant_id, body)
    return SuccessResponse(data=data)


# --- Users ---
@router.get("/users", response_model=SuccessResponse[list[UserResponse]])
async def list_users(
    user: CurrentUser = AdminRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_users(db, user.tenant_id)
    return SuccessResponse(data=data)


@router.get("/users/{user_id}", response_model=SuccessResponse[UserResponse])
async def get_user(
    user_id: uuid.UUID,
    user: CurrentUser = AdminRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_user(db, user.tenant_id, user_id)
    return SuccessResponse(data=data)


@router.put("/users/{user_id}", response_model=SuccessResponse[UserResponse])
async def update_user(
    user_id: uuid.UUID,
    body: UpdateUserRequest,
    user: CurrentUser = AdminWrite,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_user(db, user.tenant_id, user_id, body)
    return SuccessResponse(data=data)


@router.delete("/users/{user_id}")
async def remove_user(
    user_id: uuid.UUID,
    user: CurrentUser = AdminOwner,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.remove_user(db, user.tenant_id, user_id)
    return SuccessResponse(data={"message": "User removed"})


# --- Invitations ---
@router.get("/invitations", response_model=SuccessResponse[list[InvitationResponse]])
async def list_invitations(
    user: CurrentUser = AdminRead,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.list_invitations(db, user.tenant_id)
    return SuccessResponse(data=data)


@router.post("/invitations", response_model=SuccessResponse[InvitationResponse])
async def create_invitation(
    body: CreateInvitationRequest,
    user: CurrentUser = AdminWrite,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.create_invitation(db, user.tenant_id, user.id, body)

    # Trigger async email task
    from app.tasks.email import send_invitation_email

    send_invitation_email.delay(
        invitation_id=str(data.id),
        org_name="",  # Will be fetched in task
        inviter_name=f"{user.first_name} {user.last_name}",
        invitee_email=data.email,
        invitee_name=f"{data.firstName} {data.lastName}",
        module_roles=[r.model_dump() for r in data.moduleRoles],
    )

    return SuccessResponse(data=data)


@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(
    invitation_id: uuid.UUID,
    user: CurrentUser = AdminWrite,
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.cancel_invitation(db, user.tenant_id, invitation_id)
    return SuccessResponse(data={"message": "Invitation cancelled"})
