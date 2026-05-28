from __future__ import annotations

from datetime import (
    datetime,
    timezone,
)

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.base import Base
from app.utils.ids import new_id


class LoyaltyAccount(Base):
    __tablename__ = "loyalty_accounts"

    __table_args__ = (
        UniqueConstraint(
            "customer_id",
            "shop_id",
            name=(
                "uq_loyalty_accounts_"
                "customer_shop"
            ),
        ),
        Index(
            "ix_loyalty_accounts_customer_shop",
            "customer_id",
            "shop_id",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
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

    points_balance: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    tier: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text(
            "'bronze'"
        ),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(
            timezone.utc
        ),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(
            timezone.utc
        ),
        onupdate=lambda: datetime.now(
            timezone.utc
        ),
    )

    customer = relationship(
        "User",
    )

    transactions = relationship(
        "LoyaltyTransaction",
        back_populates="account",
        cascade=(
            "all, delete-orphan"
        ),
    )


class LoyaltyTransaction(Base):
    __tablename__ = (
        "loyalty_transactions"
    )

    __table_args__ = (
        Index(
            (
                "ix_loyalty_transactions_"
                "account_created"
            ),
            "account_id",
            "created_at",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "loyalty_accounts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    order_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "orders.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )  # earned|redeemed|adjusted

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(
            timezone.utc
        ),
    )

    account = relationship(
        "LoyaltyAccount",
        back_populates="transactions",
    )