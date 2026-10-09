from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from sqlalchemy import (
    Boolean,
    DateTime,
    FetchedValue,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.base import Base
from app.utils.ids import new_id


class Order(Base):
    __tablename__ = "orders"

    __table_args__ = (
        Index(
            "ix_orders_customer_created",
            "customer_id",
            "created_at",
        ),
        Index(
            "ix_orders_shop_status",
            "shop_id",
            "status",
        ),
        Index(
            "ix_orders_payment_created",
            "payment_status",
            "created_at",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )
    
    order_number: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
        index=True,
        server_default=FetchedValue(),
    )

    customer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    shop_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "shops.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'pending'"),
        index=True,
    )

    total_price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    prep_time_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    instructions: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    payment_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text("'cod'"),
    )  # cod|online|coupon

    payment_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'pending'"),
        index=True,
    )  # pending|paid

    order_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text("'delivery'"),
    )  # delivery|table_booking

    delivery_address_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    delivery_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    coupon_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )

    coupon_discount_applied: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        server_default=text("0"),
    )

    loyalty_points_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    loyalty_discount_amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        server_default=text("0"),
    )

    loyalty_points_earned: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    redeem_loyalty_points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    cancellation_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    cancellation_requests_sent: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    is_cancellation_pending: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    shop = relationship(
        "Shop",
        back_populates="orders",
        lazy="selectin",
    )

    customer = relationship(
        "User",
        lazy="selectin",
    )

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    payments = relationship(
        "Payment",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def shop_name(self) -> str | None:
        if "_shop_name" in self.__dict__ and self.__dict__["_shop_name"] is not None:
            return self.__dict__["_shop_name"]
        if "shop" in self.__dict__ and self.__dict__["shop"] is not None:
            return self.__dict__["shop"].name
        return None

    @shop_name.setter
    def shop_name(self, value: str | None) -> None:
        self.__dict__["_shop_name"] = value



class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "orders.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    item_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "menu_items.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    variant_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "menu_item_variants.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    unit_price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    item_name_snapshot: Mapped[str] = mapped_column(
        String(140),
        nullable=False,
    )

    variant_name_snapshot: Mapped[str | None] = mapped_column(
        String(60),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    order = relationship(
        "Order",
        back_populates="items",
    )

    @property
    def total_price(self) -> float:
        return float(self.unit_price * self.quantity)


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "orders.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text("'razorpay'"),
    )

    provider_order_id: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        index=True,
    )

    provider_payment_id: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        index=True,
    )

    amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        server_default=text("'INR'"),
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'created'"),
        index=True,
    )

    raw_payload: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    order = relationship(
        "Order",
        back_populates="payments",
    )