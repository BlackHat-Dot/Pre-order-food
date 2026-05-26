from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal, List

# --- INPUT SCHEMAS ---

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
    redeem_loyalty_points: int | None = Field(default=0, ge=0, le=10000)
    coupon_id: str | None = None

    payment_method: Literal["cod", "online"] = "cod"
    order_type: Literal["delivery", "table_booking"] = "delivery"
    payment_confirmed: Optional[bool] = False

    delivery_address_id: Optional[str] = None
    
class OrderStatusUpdate(BaseModel):
    status: str
    # 🚀 THE BACKEND SCHEMA FIX: Register fields safely using default None fallbacks
    decline_action: Optional[str] = None
    reason: Optional[str] = None

    class Config:
        from_attributes = True

# --- 🚀 REFACTORED INTERLOCK WORKFLOW SCHEMA ---
class OrderUpdateSchema(BaseModel):
    """
    Schema used to transition order workflow states.
    Supports customer reason strings for dispute reviews, and merchant actions.
    """
    status: Literal[
        "pending", 
        "accepted", 
        "preparing", 
        "ready", 
        "completed", 
        "cancelled", 
        "cancel_requested"
    ] = Field(
        ..., 
        description="Target status workflow lane to transition the order into."
    )
    
    reason: Optional[str] = Field(
        None, 
        max_length=250, 
        description="Customer-provided reason string required during cancel_requested transitions."
    )
    
    decline_action: Optional[Literal["decline_cancellation"]] = Field(
        None,
        description="Flag sent by shop owner to explicitly decline a pending cancel request."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "status": "cancel_requested",
                "reason": "Selected wrong delivery location coordinates accidentally."
            }
        }


# --- OUTPUT SCHEMAS ---

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
    scheduled_at: Optional[datetime] = None
    instructions: Optional[str] = None
    payment_method: str
    payment_status: str
    order_type: str  # 🚀 Added explicit schema mapping field validation
    delivery_address_id: Optional[str] = None

    cancellation_reason: Optional[str] = None
    is_cancellation_pending: bool
    cancellation_requests_sent: int = 0

    created_at: datetime
    updated_at: datetime
    
    items: List[OrderItemOut] = []
    customer: Optional[UserMinimalOut] = None  # 🚀 Core Fix: Mounts the nested user account profile cleanly

    model_config = {"from_attributes": True}

class UserMinimalOut(BaseModel):
    id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True