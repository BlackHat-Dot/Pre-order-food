from __future__ import annotations

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from typing import Any

import bcrypt
from jose import (
    JWTError,
    jwt,
)

from app.core.config import settings


# ─────────────────────────────────────────────────────────────
# Password Hashing
# ─────────────────────────────────────────────────────────────

def hash_password(
    password: str,
) -> str:

    hashed = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=12),
    )

    return hashed.decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:

    try:
        return bcrypt.checkpw(
            plain_password.encode(
                "utf-8"
            ),
            hashed_password.encode(
                "utf-8"
            ),
        )

    except ValueError:
        return False


# ─────────────────────────────────────────────────────────────
# JWT Helpers
# ─────────────────────────────────────────────────────────────

def create_token(
    *,
    subject: str,
    role: str,
    token_type: str,
    expires_delta: timedelta,
) -> str:

    now = datetime.now(
        timezone.utc
    )

    expires_at = (
        now + expires_delta
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": token_type,
        "iat": int(
            now.timestamp()
        ),
        "exp": int(
            expires_at.timestamp()
        ),
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=(
            settings.JWT_ALGORITHM
        ),
    )


def decode_token(
    token: str,
) -> dict[str, Any]:

    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[
                settings.JWT_ALGORITHM
            ],
        )

    except JWTError as exc:
        raise JWTError(
            "Invalid or expired token"
        ) from exc


# ─────────────────────────────────────────────────────────────
# Access / Refresh Tokens
# ─────────────────────────────────────────────────────────────

def create_access_token(
    subject: str,
    role: str,
) -> str:

    return create_token(
        subject=subject,
        role=role,
        token_type="access",
        expires_delta=timedelta(
            minutes=(
                settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        ),
    )


def create_refresh_token(
    subject: str,
    role: str,
) -> str:

    return create_token(
        subject=subject,
        role=role,
        token_type="refresh",
        expires_delta=timedelta(
            days=(
                settings.REFRESH_TOKEN_EXPIRE_DAYS
            )
        ),
    )


# ─────────────────────────────────────────────────────────────
# OTP Proof Tokens
# ─────────────────────────────────────────────────────────────

def create_otp_proof_token(
    *,
    vtype: str,
    ttl_seconds: int = 900,
    phone: str | None = None,
    email: str | None = None,
    user_id: str | None = None,
) -> str:

    now = datetime.now(
        timezone.utc
    )

    payload: dict[str, Any] = {
        "vtype": vtype,
        "iat": int(
            now.timestamp()
        ),
        "exp": int(
            (
                now
                + timedelta(
                    seconds=ttl_seconds
                )
            ).timestamp()
        ),
    }

    if phone:
        payload["phone"] = phone

    if email:
        payload["email"] = email

    if user_id:
        payload["uid"] = user_id

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=(
            settings.JWT_ALGORITHM
        ),
    )


def decode_otp_proof_token(
    token: str,
) -> dict[str, Any]:

    return decode_token(token)