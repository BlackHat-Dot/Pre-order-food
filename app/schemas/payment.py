from __future__ import annotations

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class PaymentCreateRequest(
    BaseModel
):

    order_id: str = Field(
        min_length=1,
        max_length=64,
    )


class PaymentVerifyRequest(
    BaseModel
):

    order_id: str = Field(
        min_length=1,
        max_length=64,
    )

    provider_order_id: str = Field(
        min_length=1,
        max_length=255,
    )

    provider_payment_id: str = Field(
        min_length=1,
        max_length=255,
    )

    signature: str | None = Field(
        default=None,
        max_length=500,
    )


class PaymentOut(
    BaseModel
):

    id: str

    order_id: str

    provider: str

    provider_order_id: (
        str | None
    )

    provider_payment_id: (
        str | None
    )

    amount: float

    currency: str

    status: str

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )