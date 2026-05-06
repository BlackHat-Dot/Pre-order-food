from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class PaymentCreateRequest(BaseModel):
    order_id: str


class PaymentVerifyRequest(BaseModel):
    order_id: str
    provider_order_id: str = None
    provider_payment_id: str = None
    signature: str | None = None


class PaymentOut(BaseModel):
    id: str
    order_id: str
    provider: str
    provider_order_id: str | None
    provider_payment_id: str | None
    amount: float
    currency: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}

