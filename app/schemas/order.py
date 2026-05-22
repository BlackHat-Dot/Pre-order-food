from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class OrderItemInput(BaseModel):
    item_id: str | None = None
    variant_id: str | None = None
    quantity: int = Field(ge=1, le=50)

    @model_validator(mode="after")
    def check_choice(self) -> "OrderItemInput":
        if self.item_id is None and self.variant_id is None:
            raise ValueError("Provide item_id for a base item or variant_id for a variant")
        if self.item_id is not None and isinstance(self.item_id, str) and not self.item_id.strip():
            raise ValueError("item_id cannot be blank")
        if self.variant_id is not None and isinstance(self.variant_id, str) and not self.variant_id.strip():
            raise ValueError("variant_id cannot be blank")
        return self


class OrderCreate(BaseModel):
    shop_id: str
    items: list[OrderItemInput] = Field(min_length=1)
    scheduled_at: datetime | None = None
    instructions: str | None = None
    payment_method: str = Field(pattern="^(cod|online)$")
    redeem_loyalty_points: int | None = Field(default=0, ge=0, le=10000)
    coupon_id: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|accepted|preparing|ready|completed|cancelled)$")


class OrderItemOut(BaseModel):
    id: str
    order_id: str
    item_id: str | None
    variant_id: str | None
    quantity: int
    unit_price: float
    item_name_snapshot: str
    variant_name_snapshot: str | None

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: str
    customer_id: str
    shop_id: str
    status: str
    total_price: float
    prep_time_minutes: int
    scheduled_at: datetime | None
    instructions: str | None
    payment_method: str
    payment_status: str
    coupon_discount_applied: float = 0.0
    loyalty_points_used: int = 0
    loyalty_discount_amount: float = 0
    loyalty_points_earned: int = 0
    created_at: datetime
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}