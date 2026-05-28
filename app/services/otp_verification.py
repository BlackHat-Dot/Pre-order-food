from __future__ import annotations

import json
import logging
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any

import hmac
from redis.asyncio import Redis
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_otp_proof_token
from app.models.otp_challenge import OtpChallenge
from app.services.cache import get_redis
from app.utils.ids import new_id

logger = logging.getLogger(__name__)

RESEND_COOLDOWN_SECONDS = 60


def _otp_storage_key(
    channel: str,
    target: str,
) -> str:
    return f"{channel}:{target}"


def _hash_code(
    channel: str,
    target: str,
    code: str,
) -> str:
    payload = (
        f"v1|{channel}|{target}|{code}"
    ).encode("utf-8")

    return hmac.new(
        settings.JWT_SECRET_KEY.encode(
            "utf-8"
        ),
        payload,
        sha256,
    ).hexdigest()


@dataclass
class OtpRecord:
    code_hash: str
    expires_at: datetime
    purpose: str
    resend_count: int


class MemoryOtpBackend:

    _rows: dict[str, OtpRecord] = {}

    def _key(
        self,
        channel: str,
        target: str,
    ) -> str:
        return _otp_storage_key(
            channel,
            target,
        )

    async def delete_expired(
        self,
        now: datetime,
    ) -> None:
        expired = [
            key
            for key, value in self._rows.items()
            if value.expires_at <= now
        ]

        for key in expired:
            self._rows.pop(key, None)

    async def get(
        self,
        channel: str,
        target: str,
    ) -> OtpRecord | None:
        return self._rows.get(
            self._key(channel, target)
        )

    async def upsert(
        self,
        channel: str,
        target: str,
        record: OtpRecord,
    ) -> None:
        self._rows[
            self._key(channel, target)
        ] = record

    async def delete(
        self,
        channel: str,
        target: str,
    ) -> None:
        self._rows.pop(
            self._key(channel, target),
            None,
        )


class DatabaseOtpBackend:

    def __init__(
        self,
        db: AsyncSession,
    ) -> None:
        self._db = db

    async def delete_expired(
        self,
        now: datetime,
    ) -> None:
        await self._db.execute(
            delete(OtpChallenge).where(
                OtpChallenge.expires_at < now
            )
        )

        await self._db.commit()

    async def get(
        self,
        channel: str,
        target: str,
    ) -> OtpRecord | None:
        now = datetime.now(
            timezone.utc
        )

        stmt = select(
            OtpChallenge
        ).where(
            OtpChallenge.channel
            == channel,
            OtpChallenge.target
            == target,
            OtpChallenge.consumed_at.is_(
                None
            ),
            OtpChallenge.expires_at
            > now,
        )

        row = (
            await self._db.execute(stmt)
        ).scalar_one_or_none()

        if not row:
            return None

        return OtpRecord(
            code_hash=row.code_hash,
            expires_at=row.expires_at,
            purpose=row.purpose,
            resend_count=int(
                row.resend_count or 0
            ),
        )

    async def upsert(
        self,
        channel: str,
        target: str,
        record: OtpRecord,
    ) -> None:
        await self._db.execute(
            delete(OtpChallenge).where(
                OtpChallenge.channel
                == channel,
                OtpChallenge.target
                == target,
            )
        )

        self._db.add(
            OtpChallenge(
                id=new_id(),
                channel=channel,
                target=target,
                code_hash=record.code_hash,
                purpose=record.purpose,
                expires_at=record.expires_at,
                resend_count=record.resend_count,
            )
        )

        await self._db.commit()

    async def delete(
        self,
        channel: str,
        target: str,
    ) -> None:
        await self._db.execute(
            delete(OtpChallenge).where(
                OtpChallenge.channel
                == channel,
                OtpChallenge.target
                == target,
            )
        )

        await self._db.commit()


class RedisOtpBackend:

    def __init__(
        self,
        prefix: str = "pof:otp:v1",
    ) -> None:
        self._prefix = prefix

    def _key(
        self,
        channel: str,
        target: str,
    ) -> str:
        return (
            f"{self._prefix}:"
            f"{channel}:{target}"
        )

    async def _redis(
        self,
    ) -> Redis:
        redis = await get_redis()

        if not redis:
            raise RuntimeError(
                "Redis unavailable"
            )

        return redis

    async def delete_expired(
        self,
        now: datetime,
    ) -> None:
        return

    async def get(
        self,
        channel: str,
        target: str,
    ) -> OtpRecord | None:
        redis = await self._redis()

        raw = await redis.get(
            self._key(channel, target)
        )

        if not raw:
            return None

        data = json.loads(raw)

        expires_at = (
            datetime.fromisoformat(
                data["expires_at"]
            )
        )

        if (
            expires_at
            <= datetime.now(
                timezone.utc
            )
        ):
            await self.delete(
                channel,
                target,
            )

            return None

        return OtpRecord(
            code_hash=data["code_hash"],
            expires_at=expires_at,
            purpose=data["purpose"],
            resend_count=int(
                data.get(
                    "resend_count",
                    0,
                )
            ),
        )

    async def upsert(
        self,
        channel: str,
        target: str,
        record: OtpRecord,
    ) -> None:
        redis = await self._redis()

        payload = json.dumps({
            "code_hash": (
                record.code_hash
            ),
            "expires_at": (
                record.expires_at.isoformat()
            ),
            "purpose": (
                record.purpose
            ),
            "resend_count": (
                record.resend_count
            ),
        })

        ttl = max(
            1,
            int(
                settings.OTP_TTL_SECONDS
            ),
        )

        await redis.set(
            self._key(channel, target),
            payload,
            ex=ttl,
        )

    async def delete(
        self,
        channel: str,
        target: str,
    ) -> None:
        redis = await self._redis()

        await redis.delete(
            self._key(channel, target)
        )


def _build_backend(
    db: AsyncSession | None,
):
    mode = (
        settings.OTP_STORAGE
        or "memory"
    ).lower()

    if mode == "redis":
        return RedisOtpBackend()

    if mode == "database":
        if db is None:
            raise RuntimeError(
                "Database session required"
            )

        return DatabaseOtpBackend(db)

    return MemoryOtpBackend()


class OtpVerificationService:

    def __init__(
        self,
        db: AsyncSession | None,
        user_name: str | None = None,
    ) -> None:
        self._db = db
        self._backend = _build_backend(
            db
        )
        self._user_name = user_name

    async def _get_redis(
        self,
    ) -> Redis | None:
        return await get_redis()

    async def _acquire_lock(
        self,
        key: str,
    ) -> bool:
        redis = await self._get_redis()

        if not redis:
            return True

        return bool(
            await redis.set(
                f"otp:lock:{key}",
                "1",
                ex=10,
                nx=True,
            )
        )

    async def _release_lock(
        self,
        key: str,
    ) -> None:
        redis = await self._get_redis()

        if redis:
            await redis.delete(
                f"otp:lock:{key}"
            )

    async def _is_in_cooldown(
        self,
        key: str,
    ) -> int:
        redis = await self._get_redis()

        if not redis:
            return 0

        ttl = await redis.ttl(
            f"otp:cooldown:{key}"
        )

        return max(0, int(ttl))

    async def _set_cooldown(
        self,
        key: str,
    ) -> None:
        redis = await self._get_redis()

        if not redis:
            return

        await redis.set(
            f"otp:cooldown:{key}",
            "1",
            ex=RESEND_COOLDOWN_SECONDS,
        )

    async def _daily_limit_ok(
        self,
        key: str,
    ) -> tuple[bool, int]:
        redis = await self._get_redis()

        max_sends = max(
            1,
            int(
                settings
                .OTP_MAX_SENDS_PER_DAY
            ),
        )

        if not redis:
            return True, max_sends

        redis_key = (
            f"otp:daily:{key}"
        )

        current = await redis.incr(
            redis_key
        )

        if current == 1:
            await redis.expire(
                redis_key,
                86400,
            )

        remaining = max(
            0,
            max_sends - current,
        )

        if current > max_sends:
            return False, 0

        return True, remaining

    async def send_otp(
        self,
        *,
        channel: str,
        target: str,
        purpose: str,
    ) -> dict[str, Any]:

        if channel != "email":
            return {
                "ok": False,
                "error": "unsupported_channel",
                "message": (
                    "Phone OTP handled "
                    "by MSG91"
                ),
            }

        now = datetime.now(
            timezone.utc
        )

        ttl = max(
            1,
            int(
                settings.OTP_TTL_SECONDS
            ),
        )

        key = _otp_storage_key(
            channel,
            target,
        )

        lock_acquired = (
            await self._acquire_lock(
                key
            )
        )

        if not lock_acquired:
            return {
                "ok": False,
                "error": "busy",
                "message": (
                    "Please try again"
                ),
            }

        try:
            cooldown_left = (
                await self._is_in_cooldown(
                    key
                )
            )

            if cooldown_left > 0:
                return {
                    "ok": False,
                    "error": "cooldown",
                    "message": (
                        f"Wait "
                        f"{cooldown_left} "
                        f"seconds"
                    ),
                    "cooldown_seconds": (
                        cooldown_left
                    ),
                }

            allowed, remaining = (
                await self._daily_limit_ok(
                    key
                )
            )

            if not allowed:
                return {
                    "ok": False,
                    "error": (
                        "rate_limited"
                    ),
                    "message": (
                        "Daily limit reached"
                    ),
                }

            code = (
                f"{random.randint(0, 999999):06d}"
            )

            expires_at = (
                now
                + timedelta(
                    seconds=ttl
                )
            )

            record = OtpRecord(
                code_hash=_hash_code(
                    channel,
                    target,
                    code,
                ),
                expires_at=expires_at,
                purpose=purpose,
                resend_count=1,
            )

            await self._backend.upsert(
                channel,
                target,
                record,
            )

            from app.services.email import (
                send_otp_email,
            )

            sent = await send_otp_email(
                to_email=target,
                code=code,
                ttl_seconds=ttl,
                user_name=self._user_name,
            )

            if not sent:
                await self._backend.delete(
                    channel,
                    target,
                )

                return {
                    "ok": False,
                    "error": (
                        "delivery_failed"
                    ),
                    "message": (
                        "Email sending failed"
                    ),
                }

            await self._set_cooldown(
                key
            )

            return {
                "ok": True,
                "expires_at": (
                    expires_at.isoformat()
                ),
                "expires_in_seconds": ttl,
                "resend_in_seconds": (
                    RESEND_COOLDOWN_SECONDS
                ),
                "max_sends_remaining": (
                    remaining
                ),
            }

        finally:
            await self._release_lock(
                key
            )

    async def verify_otp(
        self,
        *,
        channel: str,
        target: str,
        purpose: str,
        code: str,
        acting_user_id: (
            str | None
        ) = None,
    ) -> dict[str, Any]:

        if channel != "email":
            return {
                "ok": False,
                "error": (
                    "unsupported_channel"
                ),
                "message": (
                    "Phone verification "
                    "uses MSG91"
                ),
            }

        now = datetime.now(
            timezone.utc
        )

        await self._backend.delete_expired(
            now
        )

        existing = (
            await self._backend.get(
                channel,
                target,
            )
        )

        if (
            not existing
            or existing.purpose
            != purpose
        ):
            return {
                "ok": False,
                "error": "invalid_otp",
                "message": (
                    "Invalid OTP"
                ),
            }

        if (
            existing.expires_at
            <= now
        ):
            await self._backend.delete(
                channel,
                target,
            )

            return {
                "ok": False,
                "error": "expired_otp",
                "message": (
                    "OTP expired"
                ),
            }

        incoming_hash = _hash_code(
            channel,
            target,
            code,
        )

        if not hmac.compare_digest(
            existing.code_hash,
            incoming_hash,
        ):
            return {
                "ok": False,
                "error": "invalid_otp",
                "message": (
                    "Incorrect OTP"
                ),
            }

        await self._backend.delete(
            channel,
            target,
        )

        if purpose == "profile_email":
            if not acting_user_id:
                return {
                    "ok": False,
                    "error": (
                        "server_error"
                    ),
                    "message": (
                        "Missing user context"
                    ),
                }

            token = (
                create_otp_proof_token(
                    vtype="email_profile",
                    email=str(
                        target
                    ).lower(),
                    user_id=(
                        acting_user_id
                    ),
                    ttl_seconds=900,
                )
            )

        else:
            return {
                "ok": False,
                "error": (
                    "invalid_purpose"
                ),
                "message": (
                    "Unsupported purpose"
                ),
            }

        return {
            "ok": True,
            "verification_token": token,
            "token_expires_in_seconds": 900,
            "channel": channel,
        }