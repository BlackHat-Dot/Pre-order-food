from __future__ import annotations

from datetime import datetime
from typing import (
    Literal,
)

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)

from app.schemas.shop import (
    ShopOut,
)


# ─────────────────────────────────────────────────────────────
# Minimal User
# ─────────────────────────────────────────────────────────────

class UserMinimalOut(
    BaseModel
):

    id: str

    name: str | None = None

    phone: str | None = None

    email: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# ─────────────────────────────────────────────────────────────
# Order Item Input
# ─────────────────────────────────────────────────────────────

class OrderItemInput(
    BaseModel
):

    item_id: str | None = None

    variant_id: str | None = None

    quantity: int = Field(
        ge=1,
        le=50,
    )

    @model_validator(
        mode="after"
    )
    def validate_selection(
        self,
    ) -> "OrderItemInput":

        item_id = (
            self.item_id.strip()
            if self.item_id
            else None
        )

        variant_id = (
            self.variant_id.strip()
            if self.variant_id
            else None
        )

        if (
            not item_id
            and not variant_id
        ):
            raise ValueError(
                (
                    "Provide item_id "
                    "or variant_id"
                )
            )

        self.item_id = item_id
        self.variant_id = variant_id

        return self


# ─────────────────────────────────────────────────────────────
# Create Order
# ─────────────────────────────────────────────────────────────

class OrderCreate(
    BaseModel
):

    shop_id: str

    items: list[
        OrderItemInput
    ] = Field(
        min_length=1,
    )

    scheduled_at: (
        datetime | None
    ) = None

    instructions: (
        str | None
    ) = Field(
        default=None,
        max_length=1000,
    )

    redeem_loyalty_points: int = (
        Field(
            default=0,
            ge=0,
            le=10000,
        )
    )

    coupon_id: str | None = None

    payment_method: Literal[
        "cod",
        "online",
        "coupon",
    ] = "cod"

    order_type: Literal[
        "delivery",
        "table_booking",
    ] = "delivery"

    payment_confirmed: bool = False

    delivery_address_id: (
        str | None
    ) = None


# ─────────────────────────────────────────────────────────────
# Status Updates
# ─────────────────────────────────────────────────────────────

class OrderStatusUpdate(
    BaseModel
):

    status: str

    decline_action: (
        str | None
    ) = None

    reason: str | None = Field(
        default=None,
        max_length=250,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


class OrderUpdateSchema(
    BaseModel
):

    status: Literal[
        "pending",
        "accepted",
        "preparing",
        "ready",
        "completed",
        "cancelled",
        "cancel_requested",
    ]

    reason: str | None = Field(
        default=None,
        max_length=250,
        description=(
            "Reason for "
            "cancellation request"
        ),
    )

    decline_action: Literal[
        "decline_cancellation"
    ] | None = Field(
        default=None,
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": (
                    "cancel_requested"
                ),
                "reason": (
                    "Selected wrong "
                    "delivery address"
                ),
            }
        }
    )


# ─────────────────────────────────────────────────────────────
# Order Item Output
# ─────────────────────────────────────────────────────────────

class OrderItemOut(
    BaseModel
):

    id: str

    order_id: str

    item_id: str | None

    variant_id: str | None

    quantity: int

    unit_price: float

    item_name_snapshot: str

    variant_name_snapshot: (
        str | None
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


# ─────────────────────────────────────────────────────────────
# Order Output
# ─────────────────────────────────────────────────────────────

class OrderOut(
    BaseModel
):

    id: str

    order_number: int | None = None

    customer_id: str

    shop_id: str

    status: str

    total_price: float

    prep_time_minutes: int

    scheduled_at: (
        datetime | None
    ) = None

    instructions: (
        str | None
    ) = None

    payment_method: str

    payment_status: str

    order_type: str

    delivery_address_id: (
        str | None
    ) = None

    coupon_id: str | None = None

    coupon_discount_applied: (
        float
    ) = 0.0

    loyalty_points_used: int = 0

    loyalty_discount_amount: (
        float
    ) = 0.0

    loyalty_points_earned: (
        int
    ) = 0

    cancellation_reason: (
        str | None
    ) = None

    is_cancellation_pending: bool

    cancellation_requests_sent: (
        int
    ) = 0

    created_at: datetime

    updated_at: datetime

    items: list[
        OrderItemOut
    ] = Field(
        default_factory=list
    )

    customer: (
        UserMinimalOut
        | None
    ) = None

    shop: ShopOut | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )