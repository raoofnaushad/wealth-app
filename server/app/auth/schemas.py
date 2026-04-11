from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str  # user_id
    tenant_id: str
    email: str
    first_name: str
    last_name: str
    module_roles: dict[str, str]
    exp: int
    iat: int
