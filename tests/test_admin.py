from unittest.mock import AsyncMock, MagicMock
import pytest
from app.api.v1.endpoints.admin import count_users, count_shops
from app.models.user import User
from app.main import app


def test_admin_count_routes_exist():
    routes = [route.path for route in app.routes]
    assert "/api/v1/admin/users/count" in routes
    assert "/api/v1/admin/shops/count" in routes


@pytest.mark.anyio
async def test_count_users_response_shape():
    db = AsyncMock()
    db.execute.side_effect = [
        MagicMock(scalar=lambda: 10),
        MagicMock(scalar=lambda: 8),
        MagicMock(all=lambda: [("customer", 6), ("shop_owner", 3), ("admin", 1)]),
    ]
    admin_user = User(id="admin-1", role="admin")
    res = await count_users(db, admin_user)
    assert res == {
        "total": 10,
        "active": 8,
        "by_role": {
            "customer": 6,
            "shop_owner": 3,
            "admin": 1,
        },
    }


@pytest.mark.anyio
async def test_count_shops_response_shape():
    db = AsyncMock()
    db.execute.side_effect = [
        MagicMock(scalar=lambda: 5),
        MagicMock(scalar=lambda: 4),
        MagicMock(scalar=lambda: 3),
        MagicMock(scalar=lambda: 2),
    ]
    admin_user = User(id="admin-1", role="admin")
    res = await count_shops(db, admin_user)
    assert res == {
        "total": 5,
        "verified": 4,
        "active": 3,
        "open_now": 2,
    }
