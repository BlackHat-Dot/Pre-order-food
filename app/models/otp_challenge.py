from __future__ import annotations

from datetime import (
    datetime,
    timezone,
)

from sqlalchemy import (
    DateTime,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.db.base import Base
from app.utils.ids import new_id


class OtpChallenge(Base):
    """
    Stores active OTP challenges.

    Real OTP values are never stored.
    Only hashed versions are persisted.
    """

    __tablename__ = "otp_challenges"

    __table_args__ = (
        Index(
            (
                "ix_otp_challenges_"
                "channel_target"
            ),
            "channel",
            "target",
        ),
        Index(
            (
                "ix_otp_challenges_"
                "expires_at"
            ),
            "expires_at",
        ),
        Index(
            (
                "ix_otp_challenges_"
                "purpose"
            ),
            "purpose",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    channel: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        index=True,
    )  # phone|email

    target: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )  # normalized phone/email

    code_hash: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )

    purpose: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )  # signup_phone|profile_email

    expires_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
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

    consumed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    resend_count: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )