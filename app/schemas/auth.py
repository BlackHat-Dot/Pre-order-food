from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.phone import normalize_e164


class RegisterRequest(BaseModel):
    role: str = Field(pattern="^(customer|shop_owner)$")
    name: str = Field(min_length=2, max_length=120)
    phone: str
    email: EmailStr | None = None
    password: str = Field(min_length=8, max_length=128)
    # Short JWT returned by POST /verify-msg91 after successful MSG91 OTP.
    phone_verification_token: str = Field(min_length=20, max_length=2048)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        try:
            return normalize_e164(str(v))
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v: object) -> object:
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
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
