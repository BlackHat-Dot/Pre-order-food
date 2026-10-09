import pytest

from app.schemas.order import OrderItemInput
from app.utils.order_state import VALID_TRANSITIONS


def test_order_transition_pending():
    assert "accepted" in VALID_TRANSITIONS["pending"]
    assert "cancelled" in VALID_TRANSITIONS["pending"]


def test_order_transition_ready():
    assert VALID_TRANSITIONS["ready"] == {"completed"}


def test_order_transition_completed():
    assert VALID_TRANSITIONS["completed"] == set()


def test_order_transition_cancelled():
    assert VALID_TRANSITIONS["cancelled"] == set()


def test_order_item_input_allows_variant_only():
    payload = OrderItemInput(variant_id="variant-123", quantity=2)
    assert payload.item_id is None
    assert payload.variant_id == "variant-123"


def test_order_item_input_allows_item_only():
    payload = OrderItemInput(item_id="item-123", quantity=1)
    assert payload.item_id == "item-123"
    assert payload.variant_id is None


def test_order_item_input_requires_item_or_variant():
    with pytest.raises(ValueError):
        OrderItemInput(quantity=1)


def test_order_item_input_rejects_blank_variant_id():
    with pytest.raises(ValueError):
        OrderItemInput(item_id="item-123", variant_id="", quantity=1)


from unittest.mock import AsyncMock
from fastapi import HTTPException
from app.api.v1.endpoints.orders import verify_order_access
from app.models.user import User
from app.models.order import Order
from app.models.shop import Shop


def test_order_item_input_rejects_blank_item_id():
    with pytest.raises(ValueError):
        OrderItemInput(item_id="", variant_id="variant-123", quantity=1)


@pytest.mark.anyio
async def test_verify_order_access_customer_forbidden():
    db = AsyncMock()
    user = User(id="user-1", role="customer")
    order = Order(id="order-1", customer_id="user-2", shop_id="shop-1")
    with pytest.raises(HTTPException) as exc_info:
        await verify_order_access(db, user, order)
    assert exc_info.value.status_code == 403


@pytest.mark.anyio
async def test_verify_order_access_customer_allowed():
    db = AsyncMock()
    user = User(id="user-1", role="customer")
    order = Order(id="order-1", customer_id="user-1", shop_id="shop-1")
    await verify_order_access(db, user, order)


@pytest.mark.anyio
async def test_verify_order_access_shop_owner_forbidden():
    db = AsyncMock()
    shop = Shop(id="shop-1", owner_id="owner-2")
    db.get.return_value = shop
    user = User(id="owner-1", role="shop_owner")
    order = Order(id="order-1", customer_id="user-1", shop_id="shop-1")
    with pytest.raises(HTTPException) as exc_info:
        await verify_order_access(db, user, order)
    assert exc_info.value.status_code == 403


@pytest.mark.anyio
async def test_update_order_status_customer_cannot_complete():
    from unittest.mock import MagicMock
    from app.api.v1.endpoints.orders import update_order_status
    from app.schemas.order import OrderStatusUpdate

    db = AsyncMock()
    order = Order(id="order-1", customer_id="user-1", shop_id="shop-1", status="ready")
    db.execute.return_value = MagicMock(scalar_one_or_none=lambda: order)
    user = User(id="user-1", role="customer")
    with pytest.raises(HTTPException) as exc_info:
        await update_order_status("order-1", OrderStatusUpdate(status="completed"), db, user)
    assert exc_info.value.status_code == 403


@pytest.mark.anyio
async def test_update_order_status_customer_cannot_set_arbitrary_status():
    from unittest.mock import MagicMock
    from app.api.v1.endpoints.orders import update_order_status
    from app.schemas.order import OrderStatusUpdate

    db = AsyncMock()
    order = Order(id="order-1", customer_id="user-1", shop_id="shop-1", status="pending")
    db.execute.return_value = MagicMock(scalar_one_or_none=lambda: order)
    user = User(id="user-1", role="customer")
    with pytest.raises(HTTPException) as exc_info:
        await update_order_status("order-1", OrderStatusUpdate(status="preparing"), db, user)
    assert exc_info.value.status_code == 403


@pytest.mark.anyio
async def test_order_cancellation_restores_loyalty_points():
    from unittest.mock import MagicMock
    from app.api.v1.endpoints.orders import update_order_status
    from app.models.loyalty import LoyaltyAccount
    from app.schemas.order import OrderStatusUpdate

    db = AsyncMock()
    order = Order(
        id="order-1",
        customer_id="user-1",
        shop_id="shop-1",
        status="pending",
        loyalty_points_used=50,
    )
    
    loyalty_acc = LoyaltyAccount(
        id="acc-1",
        customer_id="user-1",
        shop_id="shop-1",
        points_balance=10,
    )
    db.execute.side_effect = [
        MagicMock(scalar_one_or_none=lambda: order),       # initial order lookup
        MagicMock(scalar_one_or_none=lambda: loyalty_acc), # restore loyalty points
        MagicMock(scalar_one_or_none=lambda: order),       # final get_order_or_404 return
    ]
    db.get.return_value = order

    user = User(id="user-1", role="customer")
    await update_order_status("order-1", OrderStatusUpdate(status="cancelled"), db, user)

    # State assertion (Chicago School TDD):
    # Customer had 10 points, spent 50 on order; after cancellation points should be restored to 60.
    assert loyalty_acc.points_balance == 60


@pytest.mark.anyio
async def test_create_order_rejects_coupon_for_different_shop():
    from app.api.v1.endpoints.orders import create_order
    from app.models.coupon import Coupon
    from app.models.menu import MenuItem
    from app.schemas.order import OrderCreate, OrderItemInput

    db = AsyncMock()
    shop = Shop(id="shop-1", is_open=True, is_accepting_orders=True, is_active=True)
    menu_item = MenuItem(id="item-1", shop_id="shop-1", price=100.0, is_available=True, prep_time_minutes=10, name="Item")
    
    # Coupon is for shop-2, but order is for shop-1
    coupon = Coupon(id="c-1", shop_id="shop-2", creator_id="user-1", is_active=True, is_redeemed=False, discount_value=20.0)

    db.get.side_effect = lambda model, ident, **kwargs: {
        (Shop, "shop-1"): shop,
        (MenuItem, "item-1"): menu_item,
        (Coupon, "c-1"): coupon,
    }.get((model, ident))

    user = User(id="user-1", role="customer")
    payload = OrderCreate(
        shop_id="shop-1",
        items=[OrderItemInput(item_id="item-1", quantity=1)],
        coupon_id="c-1",
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_order(payload, db, user)
    assert exc_info.value.status_code == 400
    assert "shop" in exc_info.value.detail.lower()


@pytest.mark.anyio
async def test_create_order_rejects_coupon_owned_by_another_customer():
    from app.api.v1.endpoints.orders import create_order
    from app.models.coupon import Coupon
    from app.models.menu import MenuItem
    from app.schemas.order import OrderCreate, OrderItemInput

    db = AsyncMock()
    shop = Shop(id="shop-1", is_open=True, is_accepting_orders=True, is_active=True)
    menu_item = MenuItem(id="item-1", shop_id="shop-1", price=100.0, is_available=True, prep_time_minutes=10, name="Item")
    
    # Coupon is created by user-2, but user-1 is attempting to use it
    coupon = Coupon(id="c-1", shop_id="shop-1", creator_id="user-2", is_active=True, is_redeemed=False, discount_value=20.0)

    db.get.side_effect = lambda model, ident, **kwargs: {
        (Shop, "shop-1"): shop,
        (MenuItem, "item-1"): menu_item,
        (Coupon, "c-1"): coupon,
    }.get((model, ident))

    user = User(id="user-1", role="customer")
    payload = OrderCreate(
        shop_id="shop-1",
        items=[OrderItemInput(item_id="item-1", quantity=1)],
        coupon_id="c-1",
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_order(payload, db, user)
    assert exc_info.value.status_code == 403



