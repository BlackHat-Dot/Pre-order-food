from __future__ import annotations

import json
from typing import Any

from redis.asyncio import Redis

from app.core.config import settings


_redis: Redis | None = None


async def get_redis():

    return None


async def cache_get_json(key: str) -> Any | None:
    r = await get_redis()
    if not r:
        return None
    raw = await r.get(key)
    if not raw:
        return None
    return json.loads(raw)


async def cache_set_json(key: str, value: Any, ttl_seconds: int = 300) -> None:
    r = await get_redis()
    if not r:
        return
    await r.set(key, json.dumps(value, default=str), ex=ttl_seconds)


async def cache_delete(*keys: str) -> None:
    r = await get_redis()
    if not r or not keys:
        return
    plain_keys: list[str] = []
    for key in keys:
        if "*" in key:
            matched = await r.keys(key)
            if matched:
                plain_keys.extend(matched)
        else:
            plain_keys.append(key)
    if plain_keys:
        await r.delete(*plain_keys)

