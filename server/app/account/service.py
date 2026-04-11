import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.account.schemas import ChangePasswordRequest, ProfileResponse, UpdateProfileRequest
from app.auth.service import hash_password, verify_password
from app.modules.admin.models import User
from app.shared.exceptions import not_found, validation_error


async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> ProfileResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise not_found("User not found")
    return ProfileResponse(
        id=str(user.id),
        email=user.email,
        firstName=user.first_name,
        lastName=user.last_name,
        phone=user.phone,
        address=user.address,
    )


async def update_profile(
    db: AsyncSession, user_id: uuid.UUID, data: UpdateProfileRequest
) -> ProfileResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise not_found("User not found")

    if data.firstName is not None:
        user.first_name = data.firstName
    if data.lastName is not None:
        user.last_name = data.lastName
    if data.phone is not None:
        user.phone = data.phone
    if data.address is not None:
        user.address = data.address

    await db.flush()

    return ProfileResponse(
        id=str(user.id),
        email=user.email,
        firstName=user.first_name,
        lastName=user.last_name,
        phone=user.phone,
        address=user.address,
    )


async def change_password(
    db: AsyncSession, user_id: uuid.UUID, data: ChangePasswordRequest
) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise not_found("User not found")

    if not user.password_hash:
        raise validation_error("Cannot change password for invited user")

    if not verify_password(data.currentPassword, user.password_hash):
        raise validation_error("Current password is incorrect")

    user.password_hash = hash_password(data.newPassword)
    await db.flush()
    return True
