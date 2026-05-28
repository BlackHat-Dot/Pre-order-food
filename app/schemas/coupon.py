from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class CouponMint(BaseModel):
    shop_id: str

    points: int = Field(
        gt=0,
        description=(
            "Loyalty points to redeem"
        ),
    )


class CouponOut(BaseModel):
    id: str

    code: str

    shop_id: str

    discount_value: float

    is_redeemed: bool

    is_active: bool

    created_at: datetime

    redeemed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )