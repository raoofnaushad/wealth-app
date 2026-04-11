import uuid

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, TokenResponse
from app.auth.service import (
    create_access_token,
    create_refresh_token_record,
    generate_refresh_token,
    revoke_refresh_token,
    validate_refresh_token,
    verify_password,
)
from app.config import settings
from app.database.session import get_db
from app.modules.admin.models import User, UserModuleRole
from app.shared.exceptions import unauthorized
from app.shared.schemas import SuccessResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=SuccessResponse[TokenResponse])
async def login(body: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    # Find user by email (cross-tenant — no RLS for login)
    result = await db.execute(
        select(User).where(User.email == body.email, User.status != "suspended")
    )
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise unauthorized("Invalid email or password")

    if not verify_password(body.password, user.password_hash):
        raise unauthorized("Invalid email or password")

    # Build module_roles dict
    roles_result = await db.execute(
        select(UserModuleRole).where(UserModuleRole.user_id == user.id)
    )
    module_roles = {r.module_slug: r.role for r in roles_result.scalars().all()}

    # Create access token
    access_token = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        module_roles=module_roles,
    )

    # Create refresh token
    refresh_token = generate_refresh_token()
    await create_refresh_token_record(db, user.id, refresh_token)

    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )

    return SuccessResponse(data=TokenResponse(access_token=access_token))


@router.post("/refresh", response_model=SuccessResponse[TokenResponse])
async def refresh(
    request: Request,
    response: Response,
    refresh_token: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    # Read refresh token from cookie
    token = request.cookies.get("refresh_token")
    if not token:
        raise unauthorized("No refresh token")

    # Validate and revoke old token
    record = await validate_refresh_token(db, token)
    await revoke_refresh_token(db, record)

    # Get user for new token
    result = await db.execute(select(User).where(User.id == record.user_id))
    user = result.scalar_one_or_none()
    if not user or user.status == "suspended":
        raise unauthorized("User not found or suspended")

    # Build module_roles
    roles_result = await db.execute(
        select(UserModuleRole).where(UserModuleRole.user_id == user.id)
    )
    module_roles = {r.module_slug: r.role for r in roles_result.scalars().all()}

    # Issue new tokens
    access_token = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        module_roles=module_roles,
    )

    new_refresh_token = generate_refresh_token()
    await create_refresh_token_record(db, user.id, new_refresh_token)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )

    return SuccessResponse(data=TokenResponse(access_token=access_token))


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token = request.cookies.get("refresh_token")
    if token:
        try:
            record = await validate_refresh_token(db, token)
            await revoke_refresh_token(db, record)
        except Exception:
            pass  # Token already revoked or invalid — still clear cookie

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return SuccessResponse(data={"message": "Logged out"})
