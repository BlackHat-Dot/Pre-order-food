from __future__ import annotations

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

from app.utils.phone import (
    normalize_e164,
)


class RegisterRequest(BaseModel):

    role: str = Field(
        pattern=(
            "^(customer|shop_owner)$"
        ),
    )

    name: str = Field(
        min_length=2,
        max_length=120,
    )

    phone: str

    password: str = Field(
        min_length=6,
        max_length=128,
    )

    phone_verification_token: str = Field(
        default="direct_verified_token_preorder",
        max_length=2048,
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(
        cls,
        value: str,
    ) -> str:
        try:
            return normalize_e164(value.strip())
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator(
        "name"
    )
    @classmethod
    def normalize_name(
        cls,
        value: str,
    ) -> str:

        return (
            value.strip()
        )


class LoginRequest(BaseModel):

    phone: str

    password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(
        cls,
        value: str,
    ) -> str:

        try:
            return normalize_e164(
                value.strip()
            )

        except ValueError as exc:
            raise ValueError(
                str(exc)
            ) from exc


class RefreshTokenRequest(
    BaseModel
):

    refresh_token: str = Field(
        min_length=20,
        max_length=4096,
    )


class TokenResponse(BaseModel):

    access_token: str

    refresh_token: str

    token_type: str = "bearer"

    model_config = ConfigDict(
        from_attributes=True,
    )