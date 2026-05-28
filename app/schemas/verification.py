from __future__ import annotations

from typing import Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.utils.phone import (
    normalize_e164,
)


# ─────────────────────────────────────────────────────────────
# Send OTP
# ─────────────────────────────────────────────────────────────

class SendOtpRequest(
    BaseModel
):

    channel: Literal[
        "phone",
        "email",
    ]

    purpose: Literal[
        "signup_phone",
        "profile_email",
    ]

    phone: str | None = None

    email: EmailStr | None = None

    @model_validator(
        mode="after"
    )
    def validate_target(
        self,
    ) -> "SendOtpRequest":

        if self.channel == "phone":
            if not self.phone:
                raise ValueError(
                    (
                        "phone is required "
                        "for phone channel"
                    )
                )

        else:
            if not self.email:
                raise ValueError(
                    (
                        "email is required "
                        "for email channel"
                    )
                )

        return self

    @field_validator(
        "phone"
    )
    @classmethod
    def normalize_phone(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        try:
            return normalize_e164(
                value.strip()
            )

        except ValueError as exc:
            raise ValueError(
                str(exc)
            ) from exc


# ─────────────────────────────────────────────────────────────
# Verify OTP
# ─────────────────────────────────────────────────────────────

class VerifyOtpRequest(
    BaseModel
):

    channel: Literal[
        "phone",
        "email",
    ]

    purpose: Literal[
        "signup_phone",
        "profile_email",
    ]

    code: str = Field(
        min_length=6,
        max_length=6,
    )

    phone: str | None = None

    email: EmailStr | None = None

    @model_validator(
        mode="after"
    )
    def validate_target(
        self,
    ) -> "VerifyOtpRequest":

        if self.channel == "phone":
            if not self.phone:
                raise ValueError(
                    (
                        "phone is required "
                        "for phone channel"
                    )
                )

        else:
            if not self.email:
                raise ValueError(
                    (
                        "email is required "
                        "for email channel"
                    )
                )

        return self

    @field_validator(
        "phone"
    )
    @classmethod
    def normalize_phone(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        try:
            return normalize_e164(
                value.strip()
            )

        except ValueError as exc:
            raise ValueError(
                str(exc)
            ) from exc

    @field_validator(
        "code"
    )
    @classmethod
    def validate_code(
        cls,
        value: str,
    ) -> str:

        code = value.strip()

        if (
            not code.isdigit()
            or len(code) != 6
        ):
            raise ValueError(
                (
                    "code must be "
                    "exactly 6 digits"
                )
            )

        return code


# ─────────────────────────────────────────────────────────────
# MSG91 Verification
# ─────────────────────────────────────────────────────────────

class Msg91VerifyRequest(
    BaseModel
):

    access_token: str = Field(
        min_length=1,
        max_length=2048,
    )

    phone: str

    purpose: Literal[
        "signup_phone",
        "profile_phone",
    ]

    @field_validator(
        "phone"
    )
    @classmethod
    def normalize_phone(
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