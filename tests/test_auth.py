import pytest
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password


def test_password_hash_and_verify():
    pwd = "StrongPass123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_access_token_creation():
    token = create_access_token("user-1", "customer")
    assert isinstance(token, str)
    assert token.count(".") == 2


def test_refresh_token_creation():
    token = create_refresh_token("user-2", "shop_owner")
    assert isinstance(token, str)
    assert token.count(".") == 2


@pytest.mark.anyio
async def test_user_from_access_token_rejects_inactive_user():
    from unittest.mock import AsyncMock, MagicMock
    from fastapi import HTTPException
    from app.core.deps import _user_from_access_token

    token = create_access_token("user-1", "customer")
    db = AsyncMock()
    db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    with pytest.raises(HTTPException) as exc_info:
        await _user_from_access_token(token, db)
    assert exc_info.value.status_code == 401


