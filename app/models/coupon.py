from datetime import datetime
from sqlalchemy import String, ForeignKey, Integer, Boolean, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import json

class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    shop_id: Mapped[str] = mapped_column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    points_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_value: Mapped[float] = mapped_column(Float, nullable=False)
    
    is_redeemed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    redeemed_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    order_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)