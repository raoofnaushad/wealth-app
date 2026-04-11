from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.account import service
from app.account.schemas import ChangePasswordRequest, ProfileResponse, UpdateProfileRequest
from app.shared.dependencies import CurrentUser, get_current_user, get_db_with_tenant
from app.shared.schemas import SuccessResponse

router = APIRouter(prefix="/api/v1/account", tags=["account"])


@router.get("/profile", response_model=SuccessResponse[ProfileResponse])
async def get_profile(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.get_profile(db, user.id)
    return SuccessResponse(data=data)


@router.put("/profile", response_model=SuccessResponse[ProfileResponse])
async def update_profile(
    body: UpdateProfileRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_tenant),
):
    data = await service.update_profile(db, user.id, body)
    return SuccessResponse(data=data)


@router.put("/password")
async def change_password(
    body: ChangePasswordRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_tenant),
):
    await service.change_password(db, user.id, body)
    return SuccessResponse(data={"message": "Password updated"})
