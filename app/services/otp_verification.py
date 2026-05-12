from __future__ import annotations

import asyncio
import json
import logging
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, ClassVar

import hmac
from hashlib import sha256
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_otp_proof_token
from app.models.otp_challenge import OtpChallenge
from app.services.cache import get_redis
from app.utils.ids import new_id

logger = logging.getLogger(__name__)

# One lock per phone/email so two tabs cannot create two OTPs at the same time.
_locks: dict[str, asyncio.Lock] = {}


def _lock_for(key: str) -> asyncio.Lock:
    if key not in _locks:
        _locks[key] = asyncio.Lock()
    return _locks[key]


def _otp_storage_key(channel: str, target: str) -> str:
    return f"{channel}:{target}"


def _hash_code(channel: str, target: str, code: str) -> str:
    """Turn the OTP into a safe fingerprint using a server secret (HMAC)."""
    msg = f"v1|{channel}|{target}|{code}".encode("utf-8")
    return hmac.new(settings.JWT_SECRET_KEY.encode("utf-8"), msg, sha256).hexdigest()


@dataclass
class OtpRecord:
    code_hash: str
    expires_at: datetime
    purpose: str
    resend_count: int


class _SendTracker:
    """Tracks how many OTP sends happened in the last 24 hours for one target."""

    _events: ClassVar[dict[str, list[datetime]]] = {}

    @classmethod
    def _prune(cls, key: str, now: datetime) -> list[datetime]:
        window_start = now - timedelta(hours=24)
        events = [t for t in cls._events.get(key, []) if t > window_start]
        cls._events[key] = events
        return events

    @classmethod
    def remaining_sends(cls, key: str) -> int:
        now = datetime.now(timezone.utc)
        events = cls._prune(key, now)
        max_sends = max(1, int(settings.OTP_MAX_SENDS_PER_DAY))
        return max(0, max_sends - len(events))

    @classmethod
    def record_send(cls, key: str) -> tuple[bool, int]:
        now = datetime.now(timezone.utc)
        events = cls._prune(key, now)
        max_sends = max(1, int(settings.OTP_MAX_SENDS_PER_DAY))
        if len(events) >= max_sends:
            return False, 0
        events.append(now)
        cls._events[key] = events
        return True, max(0, max_sends - len(events))


class MemoryOtpBackend:
    """Keeps OTPs in Python dict — great for local dev; data is lost on restart."""

    _rows: ClassVar[dict[str, OtpRecord]] = {}

    def _key(self, channel: str, target: str) -> str:
        return _otp_storage_key(channel, target)

    async def delete_expired(self, now: datetime) -> None:
        dead = [k for k, r in self._rows.items() if r.expires_at <= now]
        for k in dead:
            self._rows.pop(k, None)

    async def get(self, channel: str, target: str) -> OtpRecord | None:
        return self._rows.get(self._key(channel, target))

    async def upsert(self, channel: str, target: str, record: OtpRecord) -> None:
        self._rows[self._key(channel, target)] = record

    async def delete(self, channel: str, target: str) -> None:
        self._rows.pop(self._key(channel, target), None)


class DatabaseOtpBackend:
    """Stores OTP rows in PostgreSQL/SQLite — survives restarts (good for Railway)."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def delete_expired(self, now: datetime) -> None:
        await self._db.execute(delete(OtpChallenge).where(OtpChallenge.expires_at < now))
        await self._db.commit()

    async def get(self, channel: str, target: str) -> OtpRecord | None:
        now = datetime.now(timezone.utc)
        stmt = select(OtpChallenge).where(
            OtpChallenge.channel == channel,
            OtpChallenge.target == target,
            OtpChallenge.consumed_at.is_(None),
            OtpChallenge.expires_at > now,
        )
        row = (await self._db.execute(stmt)).scalar_one_or_none()
        if not row:
            return None
        return OtpRecord(
            code_hash=row.code_hash,
            expires_at=row.expires_at,
            purpose=row.purpose,
            resend_count=int(row.resend_count or 0),
        )

    async def upsert(self, channel: str, target: str, record: OtpRecord) -> None:
        await self._db.execute(
            delete(OtpChallenge).where(OtpChallenge.channel == channel, OtpChallenge.target == target)
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

    async def delete(self, channel: str, target: str) -> None:
        await self._db.execute(delete(OtpChallenge).where(OtpChallenge.channel == channel, OtpChallenge.target == target))
        await self._db.commit()


class RedisOtpBackend:
    """Stores OTP inside Redis — fast and easy to scale (needs Redis on Railway)."""

    def __init__(self, prefix: str = "pof:otp:v1") -> None:
        self._prefix = prefix

    def _key(self, channel: str, target: str) -> str:
        return f"{self._prefix}:{channel}:{target}"

    async def delete_expired(self, now: datetime) -> None:
        # Redis keys already use TTL; nothing heavy to do here.
        r = await get_redis()
        if not r:
            return

    async def get(self, channel: str, target: str) -> OtpRecord | None:
        r = await get_redis()
        if not r:
            return None
        raw = await r.get(self._key(channel, target))
        if not raw:
            return None
        data = json.loads(raw)
        expires_at = datetime.fromisoformat(data["expires_at"])
        if expires_at <= datetime.now(timezone.utc):
            await self.delete(channel, target)
            return None
        return OtpRecord(
            code_hash=data["code_hash"],
            expires_at=expires_at,
            purpose=data["purpose"],
            resend_count=int(data.get("resend_count", 0)),
        )

    async def upsert(self, channel: str, target: str, record: OtpRecord) -> None:
        r = await get_redis()
        if not r:
            raise RuntimeError("Redis is not available for OTP_STORAGE=redis")
        ttl = max(1, int(settings.OTP_TTL_SECONDS))
        payload = json.dumps(
            {
                "code_hash": record.code_hash,
                "expires_at": record.expires_at.isoformat(),
                "purpose": record.purpose,
                "resend_count": record.resend_count,
            }
        )
        await r.set(self._key(channel, target), payload, ex=ttl)

    async def delete(self, channel: str, target: str) -> None:
        r = await get_redis()
        if r:
            await r.delete(self._key(channel, target))


def _build_backend(db: AsyncSession | None) -> MemoryOtpBackend | DatabaseOtpBackend | RedisOtpBackend:
    mode = (settings.OTP_STORAGE or "memory").lower()
    if mode == "redis":
        return RedisOtpBackend()
    if mode == "database":
        if db is None:
            raise RuntimeError("Database session required for OTP_STORAGE=database")
        return DatabaseOtpBackend(db)
    return MemoryOtpBackend()


class OtpVerificationService:
    """Small helper that ties together storage, limits, and proof tokens."""

    def __init__(self, db: AsyncSession | None) -> None:
        self._db = db
        self._backend = _build_backend(db)

    async def send_otp(self, *, channel: str, target: str, purpose: str) -> dict[str, Any]:
        """
        Create a brand new OTP.
        - If an OTP is still valid, we return a friendly "please wait" response (no new OTP).
        - We also print the OTP to the server logs (instead of SMS) so you can test easily.
        """
        now = datetime.now(timezone.utc)
        ttl = max(1, int(settings.OTP_TTL_SECONDS))
        lock_key = _otp_storage_key(channel, target)
        async with _lock_for(lock_key):
            await self._backend.delete_expired(now)

            existing = await self._backend.get(channel, target)
            if existing and existing.expires_at > now:
                wait_seconds = max(0, int((existing.expires_at - now).total_seconds()))
                remaining_daily = _SendTracker.remaining_sends(lock_key)
                return {
                    "ok": False,
                    "error": "otp_active",
                    "message": "An OTP is already active. Wait for it to expire before resending.",
                    "expires_at": existing.expires_at.isoformat(),
                    "expires_in_seconds": wait_seconds,
                    "resend_available_at": existing.expires_at.isoformat(),
                    "resend_in_seconds": wait_seconds,
                    "max_sends_remaining": remaining_daily,
                }

            allowed, remaining_daily = _SendTracker.record_send(lock_key)
            if not allowed:
                return {
                    "ok": False,
                    "error": "rate_limited",
                    "message": "Too many OTP requests in the last 24 hours. Try again tomorrow.",
                }

            code = f"{random.randint(0, 999999):06d}"
            expires_at = now + timedelta(seconds=ttl)
            record = OtpRecord(
                code_hash=_hash_code(channel, target, code),
                expires_at=expires_at,
                purpose=purpose,
                resend_count=1,
            )
            await self._backend.upsert(channel, target, record)

            # Dev-friendly: show OTP in terminal logs (not sent by SMS in this project).
            logger.warning("[OTP] channel=%s target=%s purpose=%s code=%s (dev only)", channel, target, purpose, code)
            print(f"\n[OTP] {channel} {target} ({purpose}) code={code} expires in {ttl}s\n", flush=True)

            return {
                "ok": True,
                "expires_at": expires_at.isoformat(),
                "expires_in_seconds": ttl,
                "resend_available_at": expires_at.isoformat(),
                "resend_in_seconds": ttl,
                "max_sends_remaining": remaining_daily,
            }

    async def verify_otp(
        self,
        *,
        channel: str,
        target: str,
        purpose: str,
        code: str,
        acting_user_id: str | None = None,
    ) -> dict[str, Any]:
        """Check the code. If it matches, delete the OTP so it cannot be reused."""
        now = datetime.now(timezone.utc)
        lock_key = _otp_storage_key(channel, target)
        async with _lock_for(lock_key):
            await self._backend.delete_expired(now)
            existing = await self._backend.get(channel, target)
            if not existing or existing.purpose != purpose:
                return {"ok": False, "error": "invalid_otp", "message": "Invalid or expired OTP."}
            if existing.expires_at <= now:
                await self._backend.delete(channel, target)
                return {"ok": False, "error": "expired_otp", "message": "OTP expired. Request a new code."}

            if not hmac.compare_digest(existing.code_hash, _hash_code(channel, target, code)):
                return {"ok": False, "error": "invalid_otp", "message": "Invalid OTP."}

            await self._backend.delete(channel, target)

            if purpose == "signup_phone" and channel == "phone":
                token = create_otp_proof_token(vtype="phone_signup", phone=target, ttl_seconds=900)
            elif purpose == "profile_email" and channel == "email":
                if not acting_user_id:
                    return {"ok": False, "error": "server_error", "message": "Missing user context for email proof."}
                token = create_otp_proof_token(
                    vtype="email_profile",
                    email=str(target).lower(),
                    user_id=acting_user_id,
                    ttl_seconds=900,
                )
            else:
                return {"ok": False, "error": "invalid_purpose", "message": "Unsupported verification flow."}

            return {
                "ok": True,
                "verification_token": token,
                "token_expires_in_seconds": 900,
                "channel": channel,
            }
