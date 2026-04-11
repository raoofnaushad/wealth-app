from pydantic import BaseModel


class ProfileResponse(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    phone: str | None = None
    address: dict | None = None

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    phone: str | None = None
    address: dict | None = None


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str
