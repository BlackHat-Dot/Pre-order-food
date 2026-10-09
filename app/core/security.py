from __future__ import annotations

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import bcrypt
from cryptography.fernet import Fernet
from fastapi import Response
from jose import (
    JWTError,
    jwt,
)
import pyotp

from app.core.config import settings

_password_hasher = PasswordHasher()


# ─────────────────────────────────────────────────────────────
# Password Hashing (Argon2id with bcrypt backward compatibility)
# ─────────────────────────────────────────────────────────────

def hash_password(
    password: str,
) -> str:
    return _password_hasher.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    if not plain_password or not hashed_password:
        return False

    try:
        if hashed_password.startswith("$argon2"):
            return _password_hasher.verify(hashed_password, plain_password)

        # Fallback verification for preexisting bcrypt hashes
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (VerifyMismatchError, ValueError, Exception):
        return False


# ─────────────────────────────────────────────────────────────
# TOTP 2FA Encryption & Verification
# ─────────────────────────────────────────────────────────────

def _get_fernet() -> Fernet:
    raw_key = settings.TOTP_ENCRYPTION_KEY
    if raw_key and raw_key.strip():
        key_bytes = raw_key.strip().encode("utf-8")
        try:
            return Fernet(key_bytes)
        except Exception:
            pass

    # Deterministic fallback derived from JWT_SECRET_KEY
    import base64
    import hashlib
    derived = base64.urlsafe_b64encode(hashlib.sha256(settings.JWT_SECRET_KEY.encode("utf-8")).digest())
    return Fernet(derived)


def encrypt_totp_secret(secret: str) -> str:
    f = _get_fernet()
    return f.encrypt(secret.encode("utf-8")).decode("utf-8")


def decrypt_totp_secret(encrypted_secret: str) -> str:
    f = _get_fernet()
    return f.decrypt(encrypted_secret.encode("utf-8")).decode("utf-8")


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp_code(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret.strip())
    return bool(totp.verify(code.strip(), valid_window=1))


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
) -> None:
    secure = bool(settings.COOKIE_SECURE)
    samesite = "none" if secure else "lax"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )


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