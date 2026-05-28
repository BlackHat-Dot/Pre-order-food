from __future__ import annotations

from datetime import (
    datetime,
    timezone,
)

from sqlalchemy import (
    DateTime,
    Index,
    String,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.db.base import Base
from app.utils.ids import new_id


class PhoneAuditLog(Base):
    """
    Immutable audit trail
    for phone changes.
    """

    __tablename__ = (
        "phone_audit_logs"
    )

    __table_args__ = (
        Index(
            (
                "ix_phone_audit_"
                "user_created"
            ),
            "user_id",
            "created_at",
        ),
        Index(
            (
                "ix_phone_audit_"
                "new_phone"
            ),
            "new_phone",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    user_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )

    action: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )  # registered|changed

    old_phone: Mapped[
        str | None
    ] = mapped_column(
        String(30),
        nullable=True,
    )

    new_phone: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    ip_address: Mapped[
        str | None
    ] = mapped_column(
        String(45),
        nullable=True,
    )

    created_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(
            timezone.utc
        ),
    )