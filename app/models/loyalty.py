from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LoyaltyAccount(Base):
    __tablename__ = "loyalty_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    points_balance: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    tier: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'bronze'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    customer = relationship("User")
    transactions = relationship("LoyaltyTransaction", back_populates="account", cascade="all, delete-orphan")


class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("loyalty_accounts.id", ondelete="CASCADE"), nullable=False)
    order_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # earned|redeemed|adjusted
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    account = relationship("LoyaltyAccount", back_populates="transactions")


Index("ix_loyalty_transactions_account_id_created_at", LoyaltyTransaction.account_id, LoyaltyTransaction.created_at)

