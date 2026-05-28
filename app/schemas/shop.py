from __future__ import annotations

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    field_validator,
)

from app.utils.phone import (
    normalize_e164,
)


class ShopCreate(
    BaseModel
):

    name: str = Field(
        min_length=2,
        max_length=180,
    )

    phone: str

    description: str | None = Field(
        default=None,
        max_length=3000,
    )

    address_line: str = Field(
        min_length=5,
        max_length=255,
    )

    city: str = Field(
        min_length=2,
        max_length=80,
    )

    state: str = Field(
        min_length=2,
        max_length=80,
    )

    pincode: str = Field(
        min_length=4,
        max_length=12,
    )

    category: str = Field(
        min_length=2,
        max_length=60,
    )

    opening_hours: str | None = Field(
        default=None,
        max_length=120,
    )

    image_url: HttpUrl | None = None

    loyalty_discount_per_point: (
        float
    ) = Field(
        default=0.1,
        ge=0,
        le=100,
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(
        cls,
        value: str,
    ) -> str:

        return normalize_e164(
            value.strip()
        )


class ShopUpdate(
    BaseModel
):

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=180,
    )

    description: str | None = Field(
        default=None,
        max_length=3000,
    )

    address_line: str | None = (
        Field(
            default=None,
            min_length=5,
            max_length=255,
        )
    )

    city: str | None = Field(
        default=None,
        min_length=2,
        max_length=80,
    )

    state: str | None = Field(
        default=None,
        min_length=2,
        max_length=80,
    )

    pincode: str | None = Field(
        default=None,
        min_length=4,
        max_length=12,
    )

    category: str | None = Field(
        default=None,
        min_length=2,
        max_length=60,
    )

    opening_hours: str | None = (
        Field(
            default=None,
            max_length=120,
        )
    )

    phone: str | None = None

    image_url: HttpUrl | None = None

    loyalty_discount_per_point: (
        float | None
    ) = Field(
        default=None,
        ge=0,
        le=100,
    )

    is_open: bool | None = None

    is_accepting_orders: (
        bool | None
    ) = None

    @field_validator("phone")
    @classmethod
    def validate_phone(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        return normalize_e164(
            value.strip()
        )


class ShopOut(
    BaseModel
):

    id: str

    owner_id: str

    name: str

    phone: str

    description: str | None

    address_line: str

    city: str

    state: str

    pincode: str

    category: str

    opening_hours: str | None

    image_url: str | None

    loyalty_discount_per_point: (
        float
    )

    is_open: bool

    is_accepting_orders: bool

    is_verified: bool

    is_active: bool

    rating_avg: float

    rating_count: int

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class ShopStatusUpdate(
    BaseModel
):

    is_open: bool

    is_accepting_orders: bool