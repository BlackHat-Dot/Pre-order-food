from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.services.cache import get_redis


logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_bearer = HTTPBearer(auto_error=False)


async def _user_from_access_token(token: str, db: AsyncSession) -> User:
    """Turn a Bearer access token into a live User row (or raise 401)."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        exp = payload.get("exp")
    except JWTError as ex:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from ex

    if not user_id or token_type != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")
    if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    t0 = time.perf_counter()
    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    elapsed_ms = (time.perf_counter() - t0) * 1000
    if elapsed_ms > 200:
        logger.warning("Slow auth user fetch: %.1fms for user_id=%s", elapsed_ms, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    return await _user_from_access_token(token, db)


async def get_current_user_optional(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(optional_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    if not creds or not creds.credentials:
        return None
    try:
        return await _user_from_access_token(creds.credentials, db)
    except HTTPException:
        return None


def require_roles(*allowed_roles: str):
    async def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return checker


async def basic_rate_limit(request: Request) -> None:
    redis = await get_redis()
    if redis is None:
        return
    client_key = request.client.host if request.client else "unknown"
    key = f"rl:{client_key}:{request.url.path}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > 120:
        raise HTTPException(status_code=429, detail="Too many requests")

