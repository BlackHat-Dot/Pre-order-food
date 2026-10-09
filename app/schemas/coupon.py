from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class CouponMint(BaseModel):
    shop_id: str

    points: int = Field(
        gt=0,
        le=10000,
        strict=True,
        description=(
            "Loyalty points to redeem"
        ),
    )


class CouponOut(BaseModel):
    id: str

    code: str

    discount_value: float

    model_config = ConfigDict(
        from_attributes=True,
    )