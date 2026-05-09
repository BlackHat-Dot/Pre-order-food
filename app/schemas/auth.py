from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    role: str = Field(pattern="^(customer|shop_owner)$")
    name: str = Field(min_length=2, max_length=120)
    phone: str
    email: EmailStr | None = None
    password: str = Field(min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 10:
            raise ValueError("phone must be 10 digits")
        return v


class LoginRequest(BaseModel):
    phone: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

