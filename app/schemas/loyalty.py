from __future__ import annotations

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class LoyaltyAccountOut(
    BaseModel
):

    id: str

    customer_id: str

    shop_id: str

    points_balance: int

    tier: str

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class LoyaltyTransactionOut(
    BaseModel
):

    id: str

    account_id: str

    order_id: str | None

    points: int

    action: str

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class LoyaltyRedeemRequest(
    BaseModel
):

    shop_id: str

    points: int = Field(
        ge=1,
        le=10000,
    )