from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from datetime import (
    datetime,
    timezone,
)
from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
    OAuth2PasswordBearer,
)
from jose import (
    JWTError,
    jwt,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.core.config import settings
from app.db.session import get_db, get_redis
from app.models.user import User

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)

optional_bearer = HTTPBearer(
    auto_error=False
)

# ─────────────────────────────────────────────────────────────
# In-Memory Token Revocation Store
# ─────────────────────────────────────────────────────────────

_revoked_tokens: dict[str, float] = {}
_revoked_lock = asyncio.Lock()


async def revoke_token(token: str, exp_timestamp: float | None = None) -> None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    ttl = int(exp_timestamp - time.time()) if exp_timestamp else 3600
    if ttl <= 0:
        ttl = 300

    redis = await get_redis()
    if redis is not None:
        try:
            await redis.set(f"revoked:{token_hash}", "1", ex=ttl)
            return
        except Exception as exc:
            logger.warning("Redis token revocation failed: %s, using in-memory store", exc)

    async with _revoked_lock:
        _revoked_tokens[token_hash] = time.time() + ttl


async def is_token_revoked(token: str) -> bool:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    redis = await get_redis()
    if redis is not None:
        try:
            val = await redis.get(f"revoked:{token_hash}")
            if val is not None:
                return True
        except Exception as exc:
            logger.warning("Redis token revocation check failed: %s", exc)

    async with _revoked_lock:
        now = time.time()
        # Evict expired
        expired = [h for h, exp in _revoked_tokens.items() if exp < now]
        for h in expired:
            _revoked_tokens.pop(h, None)
        return token_hash in _revoked_tokens


# ─────────────────────────────────────────────────────────────
# Token Extraction & Validation
# ─────────────────────────────────────────────────────────────

def decode_access_token(
    token: str,
) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    token_type = payload.get("type")
    user_id = payload.get("sub")
    exp = payload.get("exp")

    if not user_id or token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )

    if exp:
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
            )

    return payload


async def get_token_from_request(
    request: Request,
    bearer_creds: Annotated[HTTPAuthorizationCredentials | None, Depends(optional_bearer)] = None,
) -> str:
    # 1. Bearer token from header
    if bearer_creds and bearer_creds.credentials:
        return bearer_creds.credentials

    # 2. Authorization header fallback
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    # 3. HttpOnly Cookie fallback
    cookie_token = request.cookies.get("access_token")
    if cookie_token and cookie_token.strip():
        return cookie_token.strip()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


async def get_optional_token_from_request(
    request: Request,
    bearer_creds: Annotated[HTTPAuthorizationCredentials | None, Depends(optional_bearer)] = None,
) -> str | None:
    try:
        return await get_token_from_request(request, bearer_creds)
    except HTTPException:
        return None


# ─────────────────────────────────────────────────────────────
# User Fetching
# ─────────────────────────────────────────────────────────────

async def _user_from_access_token(
    token: str,
    db: AsyncSession,
) -> User:
    if await is_token_revoked(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    payload = decode_access_token(token)
    user_id = payload["sub"]

    t0 = time.perf_counter()
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_active.is_(True),
        )
    )
    user = result.scalar_one_or_none()
    elapsed_ms = (time.perf_counter() - t0) * 1000

    if elapsed_ms > 200:
        logger.warning("Slow auth fetch user_id=%s duration=%.1fms", user_id, elapsed_ms)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def get_current_user(
    token: Annotated[str, Depends(get_token_from_request)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    return await _user_from_access_token(token, db)


async def get_current_user_optional(
    token: Annotated[str | None, Depends(get_optional_token_from_request)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    if not token:
        return None
    try:
        return await _user_from_access_token(token, db)
    except HTTPException:
        return None


# ─────────────────────────────────────────────────────────────
# Privileged Role & Gate Enforcement
# ─────────────────────────────────────────────────────────────

async def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: admin role required",
        )
    return user


def require_roles(*allowed_roles: str):
    allowed = set(allowed_roles)

    async def checker(
        user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: insufficient permissions",
            )
        return user

    return checker


# ─────────────────────────────────────────────────────────────
# Robust Tiered Rate Limiting (Redis with In-Memory Fallback)
# ─────────────────────────────────────────────────────────────

_memory_rl_store: dict[str, list[float]] = {}
_memory_rl_lock = asyncio.Lock()


async def _enforce_rate_limit(
    request: Request,
    limit: int,
    window_seconds: int = 60,
    prefix: str = "rl",
) -> None:
    client_ip = request.client.host if request.client else "unknown"
    route_path = request.url.path
    key = f"{prefix}:{client_ip}:{route_path}"

    redis = await get_redis()
    if redis is not None:
        try:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window_seconds)
            if count > limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                )
            return
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Redis rate limit error: %s, falling back to memory store", exc)

    # In-memory sliding window fallback (guarantees fail-secure rate limiting)
    now = time.time()
    cutoff = now - window_seconds
    async with _memory_rl_lock:
        timestamps = _memory_rl_store.get(key, [])
        # Prune old timestamps
        timestamps = [ts for ts in timestamps if ts > cutoff]
        if len(timestamps) >= limit:
            _memory_rl_store[key] = timestamps
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
        timestamps.append(now)
        _memory_rl_store[key] = timestamps

        # Periodic cleanup of idle keys
        if len(_memory_rl_store) > 1000:
            stale_keys = [k for k, ts_list in _memory_rl_store.items() if not ts_list or ts_list[-1] <= cutoff]
            for k in stale_keys:
                _memory_rl_store.pop(k, None)


async def basic_rate_limit(request: Request) -> None:
    await _enforce_rate_limit(request, limit=120, window_seconds=60, prefix="rl:basic")


async def rate_limit_auth(request: Request) -> None:
    await _enforce_rate_limit(request, limit=10, window_seconds=60, prefix="rl:auth")


async def rate_limit_checkout(request: Request) -> None:
    await _enforce_rate_limit(request, limit=15, window_seconds=60, prefix="rl:checkout")


async def rate_limit_sensitive(request: Request) -> None:
    await _enforce_rate_limit(request, limit=20, window_seconds=60, prefix="rl:sensitive")