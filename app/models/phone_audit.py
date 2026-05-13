from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PhoneAuditLog(Base):
    """Immutable audit trail for phone number changes."""

    __tablename__ = "phone_audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # registered | changed
    old_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    new_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


Index("ix_phone_audit_user_id", PhoneAuditLog.user_id)
Index("ix_phone_audit_created_at", PhoneAuditLog.created_at)
