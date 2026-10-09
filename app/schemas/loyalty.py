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

    points_balance: int

    tier: str

    model_config = ConfigDict(
        from_attributes=True,
    )


class LoyaltyTransactionOut(
    BaseModel
):

    id: str

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