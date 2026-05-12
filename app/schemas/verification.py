from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class SendOtpRequest(BaseModel):
    """Body for POST /send-otp — asks the server to create a fresh OTP."""

    channel: Literal["phone", "email"]
    purpose: Literal["signup_phone", "profile_email"]
    phone: str | None = None
    email: EmailStr | None = None

    @model_validator(mode="after")
    def check_target_matches_channel(self) -> "SendOtpRequest":
        if self.channel == "phone":
            if not self.phone or not str(self.phone).strip():
                raise ValueError("phone is required when channel is phone")
        else:
            if not self.email:
                raise ValueError("email is required when channel is email")
        return self

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        digits = "".join(ch for ch in str(v) if ch.isdigit())
        if len(digits) != 10:
            raise ValueError("phone must be exactly 10 digits")
        return digits


class VerifyOtpRequest(BaseModel):
    """Body for POST /verify-otp — user types the 6-digit code they received."""

    channel: Literal["phone", "email"]
    purpose: Literal["signup_phone", "profile_email"]
    code: str = Field(min_length=6, max_length=6)
    phone: str | None = None
    email: EmailStr | None = None

    @model_validator(mode="after")
    def check_target_matches_channel(self) -> "VerifyOtpRequest":
        if self.channel == "phone":
            if not self.phone:
                raise ValueError("phone is required when channel is phone")
        else:
            if not self.email:
                raise ValueError("email is required when channel is email")
        return self

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        digits = "".join(ch for ch in str(v) if ch.isdigit())
        if len(digits) != 10:
            raise ValueError("phone must be exactly 10 digits")
        return digits

    @field_validator("code")
    @classmethod
    def digits_only(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("code must be 6 digits")
        return v
