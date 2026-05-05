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
    assert payload.phone == "9876543210"


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

