from unittest.mock import AsyncMock, patch
import pytest
from app.services.cache import acquire_lock


@pytest.mark.anyio
async def test_acquire_lock_degrades_when_redis_none():
    with patch("app.services.cache.redis_client", new=AsyncMock(return_value=None)):
        assert await acquire_lock("test_key") is True
