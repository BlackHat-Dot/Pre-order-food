from __future__ import annotations

from datetime import datetime
import strawberry


@strawberry.type
class UserType:
    id: strawberry.ID
    role: str
    name: str
    phone: str
    is_active: bool
    phone_verified: bool
    created_at: datetime


@strawberry.type
class MenuItemVariantType:
    id: strawberry.ID
    item_id: str
    name: str
    price: float
    is_available: bool

    @strawberry.field
    def price_adjustment(self) -> float:
        return self.price


@strawberry.type
class MenuItemType:
    id: strawberry.ID
    shop_id: str
    name: str
    description: str | None
    price: float
    category: str | None
    dietary_type: str
    image_url: str | None
    is_available: bool
    is_featured: bool
    prep_time_minutes: int
    created_at: datetime
    variants: list[MenuItemVariantType]

    @strawberry.field
    def base_price(self) -> float:
        return self.price


@strawberry.type
class ShopType:
    id: strawberry.ID
    owner_id: str
    name: str
    phone: str
    description: str | None
    address_line: str
    city: str
    state: str
    pincode: str
    category: str
    opening_hours: str | None
    image_url: str | None
    loyalty_discount_per_point: float
    is_open: bool
    is_accepting_orders: bool
    is_verified: bool
    is_active: bool
    rating_avg: float
    rating_count: int
    created_at: datetime

    @strawberry.field
    def rating(self) -> float:
        return self.rating_avg

    @strawberry.field
    def total_reviews(self) -> int:
        return self.rating_count

    @strawberry.field
    def cuisine(self) -> str:
        return self.category

    @strawberry.field
    def address(self) -> str:
        return self.address_line

    @strawberry.field
    async def menu_items(self, info: strawberry.Info) -> list[MenuItemType]:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.menu import MenuItem

        db = info.context["db"]
        lock = info.context.get("db_lock")
        stmt = (
            select(MenuItem)
            .where(MenuItem.shop_id == str(self.id))
            .options(selectinload(MenuItem.variants))
            .order_by(MenuItem.is_featured.desc(), MenuItem.created_at.desc())
        )
        if lock:
            async with lock:
                res = await db.execute(stmt)
        else:
            res = await db.execute(stmt)
        items = res.scalars().all()
        return [
            MenuItemType(
                id=strawberry.ID(item.id),
                shop_id=item.shop_id,
                name=item.name,
                description=item.description,
                price=float(item.price),
                category=item.category,
                dietary_type=item.dietary_type,
                image_url=item.image_url,
                is_available=bool(item.is_available),
                is_featured=bool(item.is_featured),
                prep_time_minutes=int(item.prep_time_minutes or 0),
                created_at=item.created_at,
                variants=[
                    MenuItemVariantType(
                        id=strawberry.ID(v.id),
                        item_id=v.item_id,
                        name=v.name,
                        price=float(v.price or 0.0),
                        is_available=bool(v.is_available),
                    )
                    for v in (item.variants or [])
                ],
            )
            for item in items
        ]


@strawberry.type
class OrderItemType:
    id: strawberry.ID
    item_id: str
    variant_id: str | None
    item_name: str
    variant_name: str | None
    quantity: int
    unit_price: float
    total_price: float


@strawberry.type
class OrderShopType:
    id: strawberry.ID
    name: str


@strawberry.type
class OrderType:
    id: strawberry.ID
    order_number: int | None
    customer_id: str
    shop_id: str
    shop_name: str | None
    status: str
    total_price: float
    payment_method: str
    payment_status: str
    order_type: str
    delivery_address: str | None
    instructions: str | None
    created_at: datetime
    items: list[OrderItemType]

    @strawberry.field
    def shop(self) -> OrderShopType | None:
        if not self.shop_name and not self.shop_id:
            return None
        return OrderShopType(
            id=strawberry.ID(self.shop_id or ""),
            name=self.shop_name or "",
        )

