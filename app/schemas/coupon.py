from pydantic import BaseModel
from datetime import datetime

class CouponMint(BaseModel):
    shop_id: str
    points: int

class CouponOut(BaseModel):
    id: str
    code: str
    shop_id: str
    discount_value: float
    is_redeemed: bool
    created_at: datetime

    class Config:
        from_attributes = True