from __future__ import annotations

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)
from typing import Any


class ReviewCreate(
    BaseModel
):

    order_id: str | None = None

    rating: int = Field(
        ge=1,
        le=5,
    )

    comment: str | None = Field(
        default=None,
        max_length=1000,
    )

    @field_validator("order_id", mode="before")
    @classmethod
    def clean_order_id(cls, v: Any) -> str | None:
        if v == "" or v is None:
            return None
        return str(v)

    @field_validator("comment", mode="before")
    @classmethod
    def clean_comment(cls, v: Any) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s if s else None


class ReviewUpdate(
    BaseModel
):

    rating: int | None = Field(
        default=None,
        ge=1,
        le=5,
    )

    comment: str | None = Field(
        default=None,
        max_length=1000,
    )


class ReviewOut(
    BaseModel
):

    id: str

    order_id: str | None = None

    shop_id: str

    customer_id: str

    rating: int

    comment: str | None = None

    created_at: datetime

    customer_name: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )