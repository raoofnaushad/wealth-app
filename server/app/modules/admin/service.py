import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin import repository
from app.modules.admin.schemas import (
    BrandingResponse,
    CreateInvitationRequest,
    InvitationResponse,
    ModuleRoleSchema,
    OrganizationResponse,
    PreferencesResponse,
    UpdateBrandingRequest,
    UpdateOrganizationRequest,
    UpdatePreferencesRequest,
    UpdateUserRequest,
    UserResponse,
)
from app.shared.exceptions import not_found


# --- Organization ---
async def get_organization(db: AsyncSession, tenant_id: uuid.UUID) -> OrganizationResponse:
    org = await repository.get_organization(db, tenant_id)
    if not org:
        raise not_found("Organization not found")
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        registrationNumber=org.registration_number,
        website=org.website,
        currency=org.currency,
        timezone=org.timezone,
        supportEmail=org.support_email,
        status=org.status,
        address=org.address,
    )


async def update_organization(
    db: AsyncSession, tenant_id: uuid.UUID, data: UpdateOrganizationRequest
) -> OrganizationResponse:
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.registrationNumber is not None:
        update_data["registration_number"] = data.registrationNumber
    if data.website is not None:
        update_data["website"] = data.website
    if data.currency is not None:
        update_data["currency"] = data.currency
    if data.timezone is not None:
        update_data["timezone"] = data.timezone
    if data.supportEmail is not None:
        update_data["support_email"] = data.supportEmail
    if data.address is not None:
        update_data["address"] = data.address.model_dump()

    org = await repository.update_organization(db, tenant_id, update_data)
    if not org:
        raise not_found("Organization not found")
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        registrationNumber=org.registration_number,
        website=org.website,
        currency=org.currency,
        timezone=org.timezone,
        supportEmail=org.support_email,
        status=org.status,
        address=org.address,
    )


# --- Branding ---
async def get_branding(db: AsyncSession, tenant_id: uuid.UUID) -> BrandingResponse:
    branding = await repository.get_branding(db, tenant_id)
    if not branding:
        return BrandingResponse(headerLogo="small", brandColor="#000000")
    return BrandingResponse(
        headerLogo=branding.header_logo,
        brandColor=branding.brand_color,
        emailFooter=branding.email_footer,
        smallLogoUrl=branding.small_logo_url,
        largeLogoUrl=branding.large_logo_url,
    )


async def update_branding(
    db: AsyncSession, tenant_id: uuid.UUID, data: UpdateBrandingRequest
) -> BrandingResponse:
    update_data = {}
    if data.headerLogo is not None:
        update_data["header_logo"] = data.headerLogo
    if data.brandColor is not None:
        update_data["brand_color"] = data.brandColor
    if data.emailFooter is not None:
        update_data["email_footer"] = data.emailFooter
    if data.smallLogoUrl is not None:
        update_data["small_logo_url"] = data.smallLogoUrl
    if data.largeLogoUrl is not None:
        update_data["large_logo_url"] = data.largeLogoUrl

    branding = await repository.upsert_branding(db, tenant_id, update_data)
    return BrandingResponse(
        headerLogo=branding.header_logo,
        brandColor=branding.brand_color,
        emailFooter=branding.email_footer,
        smallLogoUrl=branding.small_logo_url,
        largeLogoUrl=branding.large_logo_url,
    )


# --- Preferences ---
async def get_preferences(db: AsyncSession, tenant_id: uuid.UUID) -> PreferencesResponse:
    prefs = await repository.get_preferences(db, tenant_id)
    if not prefs:
        return PreferencesResponse(dateFormat="MM/DD/YYYY", numberFormat="en-US")
    return PreferencesResponse(
        dateFormat=prefs.date_format,
        numberFormat=prefs.number_format,
    )


async def update_preferences(
    db: AsyncSession, tenant_id: uuid.UUID, data: UpdatePreferencesRequest
) -> PreferencesResponse:
    update_data = {}
    if data.dateFormat is not None:
        update_data["date_format"] = data.dateFormat
    if data.numberFormat is not None:
        update_data["number_format"] = data.numberFormat

    prefs = await repository.upsert_preferences(db, tenant_id, update_data)
    return PreferencesResponse(
        dateFormat=prefs.date_format,
        numberFormat=prefs.number_format,
    )


# --- Users ---
def _user_to_response(user) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        firstName=user.first_name,
        lastName=user.last_name,
        phone=user.phone,
        status=user.status,
        moduleRoles=[
            ModuleRoleSchema(moduleSlug=r.module_slug, role=r.role) for r in user.module_roles
        ],
    )


async def list_users(db: AsyncSession, tenant_id: uuid.UUID) -> list[UserResponse]:
    users = await repository.list_users(db, tenant_id)
    return [_user_to_response(u) for u in users]


async def get_user(db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID) -> UserResponse:
    user = await repository.get_user(db, tenant_id, user_id)
    if not user:
        raise not_found("User not found")
    return _user_to_response(user)


async def update_user(
    db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID, data: UpdateUserRequest
) -> UserResponse:
    if data.status is not None:
        user = await repository.update_user_status(db, tenant_id, user_id, data.status)
        if not user:
            raise not_found("User not found")

    if data.moduleRoles is not None:
        roles = [{"moduleSlug": r.moduleSlug, "role": r.role} for r in data.moduleRoles]
        user = await repository.update_user_module_roles(db, tenant_id, user_id, roles)
        if not user:
            raise not_found("User not found")

    # Fetch fresh user state
    user = await repository.get_user(db, tenant_id, user_id)
    if not user:
        raise not_found("User not found")
    return _user_to_response(user)


async def remove_user(db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    deleted = await repository.delete_user(db, tenant_id, user_id)
    if not deleted:
        raise not_found("User not found")
    return True


# --- Invitations ---
def _invitation_to_response(inv) -> InvitationResponse:
    module_roles = [ModuleRoleSchema(**r) for r in inv.module_roles]
    return InvitationResponse(
        id=inv.id,
        email=inv.email,
        firstName=inv.first_name,
        lastName=inv.last_name,
        moduleRoles=module_roles,
        status=inv.status,
        invitedBy=inv.invited_by,
        expiresAt=inv.expires_at,
        createdAt=inv.created_at,
    )


async def list_invitations(db: AsyncSession, tenant_id: uuid.UUID) -> list[InvitationResponse]:
    invitations = await repository.list_invitations(db, tenant_id)
    return [_invitation_to_response(inv) for inv in invitations]


async def create_invitation(
    db: AsyncSession, tenant_id: uuid.UUID, invited_by: uuid.UUID, data: CreateInvitationRequest
) -> InvitationResponse:
    inv_data = {
        "email": data.email,
        "firstName": data.firstName,
        "lastName": data.lastName,
        "moduleRoles": [r.model_dump() for r in data.moduleRoles],
    }
    invitation = await repository.create_invitation(db, tenant_id, invited_by, inv_data)
    return _invitation_to_response(invitation)


async def cancel_invitation(
    db: AsyncSession, tenant_id: uuid.UUID, invitation_id: uuid.UUID
) -> bool:
    cancelled = await repository.cancel_invitation(db, tenant_id, invitation_id)
    if not cancelled:
        raise not_found("Invitation not found")
    return True
