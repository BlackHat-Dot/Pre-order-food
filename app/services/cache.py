from __future__ import annotations

import json
import logging
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.db.session import get_redis

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Base Redis Access
# ─────────────────────────────────────────────────────────────

async def redis_client() -> Redis | None:
    try:
        return await get_redis()

    except Exception as e:
        logger.warning(
            "Redis client unavailable: %s",
            e,
        )
        return None


# ─────────────────────────────────────────────────────────────
# JSON Cache
# ─────────────────────────────────────────────────────────────

async def cache_get_json(
    key: str,
) -> Any | None:
    redis = await redis_client()

    if not redis:
        return None

    try:
        raw = await redis.get(key)

        if raw is None:
            return None

        return json.loads(raw)

    except json.JSONDecodeError:
        logger.warning(
            "Invalid JSON cache payload key=%s",
            key,
        )
        return None

    except RedisError as e:
        logger.warning(
            "Redis cache_get_json failed key=%s error=%s",
            key,
            e,
        )
        return None


async def cache_set_json(
    key: str,
    value: Any,
    ttl_seconds: int = 300,
) -> None:
    redis = await redis_client()

    if not redis:
        return

    try:
        await redis.set(
            key,
            json.dumps(
                value,
                default=str,
            ),
            ex=max(1, ttl_seconds),
        )

    except RedisError as e:
        logger.warning(
            "Redis cache_set_json failed key=%s error=%s",
            key,
            e,
        )


# ─────────────────────────────────────────────────────────────
# Plain Cache
# ─────────────────────────────────────────────────────────────

async def cache_get(
    key: str,
) -> str | None:
    redis = await redis_client()

    if not redis:
        return None

    try:
        return await redis.get(key)

    except RedisError as e:
        logger.warning(
            "Redis cache_get failed key=%s error=%s",
            key,
            e,
        )
        return None


async def cache_set(
    key: str,
    value: str,
    ttl_seconds: int = 300,
) -> None:
    redis = await redis_client()

    if not redis:
        return

    try:
        await redis.set(
            key,
            value,
            ex=max(1, ttl_seconds),
        )

    except RedisError as e:
        logger.warning(
            "Redis cache_set failed key=%s error=%s",
            key,
            e,
        )


async def cache_exists(
    key: str,
) -> bool:
    redis = await redis_client()

    if not redis:
        return False

    try:
        return bool(
            await redis.exists(key)
        )

    except RedisError as e:
        logger.warning(
            "Redis cache_exists failed key=%s error=%s",
            key,
            e,
        )
        return False


async def cache_delete(
    *keys: str,
) -> None:
    redis = await redis_client()

    if not redis or not keys:
        return

    try:
        resolved_keys: list[str] = []

        for key in keys:
            if "*" in key:
                async for matched_key in redis.scan_iter(
                    match=key,
                ):
                    resolved_keys.append(
                        matched_key
                    )
            else:
                resolved_keys.append(key)

        if resolved_keys:
            await redis.delete(
                *resolved_keys
            )

    except RedisError as e:
        logger.warning(
            "Redis cache_delete failed keys=%s error=%s",
            keys,
            e,
        )


# ─────────────────────────────────────────────────────────────
# Counters / Rate Limiting
# ─────────────────────────────────────────────────────────────

async def cache_increment(
    key: str,
    ttl_seconds: int | None = None,
) -> int:
    redis = await redis_client()

    if not redis:
        return 0

    try:
        value = await redis.incr(key)

        if ttl_seconds:
            await redis.expire(
                key,
                ttl_seconds,
            )

        return int(value)

    except RedisError as e:
        logger.warning(
            "Redis cache_increment failed key=%s error=%s",
            key,
            e,
        )
        return 0


# ─────────────────────────────────────────────────────────────
# Distributed Locks
# ─────────────────────────────────────────────────────────────

async def acquire_lock(
    key: str,
    ttl_seconds: int = 30,
) -> bool:
    redis = await redis_client()

    if not redis:
        return False

    try:
        return bool(
            await redis.set(
                f"lock:{key}",
                "1",
                ex=max(1, ttl_seconds),
                nx=True,
            )
        )

    except RedisError as e:
        logger.warning(
            "Redis acquire_lock failed key=%s error=%s",
            key,
            e,
        )
        return False


async def release_lock(
    key: str,
) -> None:
    redis = await redis_client()

    if not redis:
        return

    try:
        await redis.delete(
            f"lock:{key}"
        )

    except RedisError as e:
        logger.warning(
            "Redis release_lock failed key=%s error=%s",
            key,
            e,
        )