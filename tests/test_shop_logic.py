import pytest
from app.schemas.menu import MenuItemCreate, VariantCreate
from app.schemas.shop import ShopCreate


def test_shop_schema_valid():
    payload = ShopCreate(
        name="Cafe One",
        phone="9876543210",
        description="Nice cafe",
        address_line="Street 1",
        city="Chennai",
        state="TN",
        pincode="600001",
        category="Cafe",
        opening_hours="9AM-9PM",
    )
    assert payload.phone == "+919876543210"


def test_menu_item_schema_valid():
    item = MenuItemCreate(
        name="Burger",
        description="Cheese burger",
        price=120.0,
        category="Fast Food",
        dietary_type="non_veg",
        prep_time_minutes=15,
    )
    assert item.price == 120.0


def test_variant_schema_valid():
    variant = VariantCreate(name="Large", price=199.0, prep_time_minutes=20, is_available=True)
    assert variant.name == "Large"


@pytest.mark.anyio
async def test_create_review_rejects_cancelled_order():
    from unittest.mock import AsyncMock
    from fastapi import HTTPException
    import pytest
    from app.api.v1.endpoints.reviews import create_review
    from app.models.order import Order
    from app.models.user import User
    from app.schemas.review import ReviewCreate

    db = AsyncMock()
    from unittest.mock import MagicMock
    db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    order = Order(
        id="order-1",
        customer_id="cust-1",
        shop_id="shop-1",
        status="cancelled",
        payment_status="paid",  # was paid before cancellation
    )
    db.get.return_value = order
    user = User(id="cust-1", role="customer")
    payload = ReviewCreate(order_id="order-1", rating=5, comment="Great")

    with pytest.raises(HTTPException) as exc_info:
        await create_review(payload, db, user)
    assert exc_info.value.status_code == 400
    assert "cancelled" in exc_info.value.detail.lower() or "not allowed" in exc_info.value.detail.lower()

