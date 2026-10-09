from __future__ import annotations

import strawberry
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.graphql.types import (
    UserType,
    ShopType,
    OrderType,
    OrderItemType,
)
from app.models.shop import Shop
from app.models.order import Order
from app.api.v1.endpoints.orders import populate_delivery_addresses


async def db_execute(info: strawberry.Info, stmt):
    db = info.context["db"]
    lock = info.context.get("db_lock")
    if lock:
        async with lock:
            return await db.execute(stmt)
    return await db.execute(stmt)


@strawberry.type
class Query:
    @strawberry.field
    async def me(self, info: strawberry.Info) -> UserType | None:
        user = info.context.get("user")
        if not user:
            return None
        return UserType(
            id=strawberry.ID(user.id),
            role=user.role,
            name=user.name,
            phone=user.phone,
            is_active=bool(user.is_active),
            phone_verified=bool(user.phone_verified),
            created_at=user.created_at,
        )

    @strawberry.field
    async def shops(
        self,
        info: strawberry.Info,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        category: str | None = None,
        city: str | None = None,
    ) -> list[ShopType]:
        stmt = select(Shop).where(Shop.is_active.is_(True))

        if search:
            stmt = stmt.where(Shop.name.ilike(f"%{search}%"))
        if category:
            stmt = stmt.where(Shop.category.ilike(f"%{category}%"))
        if city:
            stmt = stmt.where(Shop.city.ilike(f"%{city}%"))

        stmt = (
            stmt.order_by(
                Shop.rating_avg.desc(),
                Shop.rating_count.desc(),
                Shop.created_at.desc(),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await db_execute(info, stmt)
        shops = res.scalars().all()

        return [
            ShopType(
                id=strawberry.ID(s.id),
                owner_id=s.owner_id,
                name=s.name,
                phone=s.phone,
                description=s.description,
                address_line=s.address_line,
                city=s.city,
                state=s.state,
                pincode=s.pincode,
                category=s.category,
                opening_hours=s.opening_hours,
                image_url=s.image_url,
                loyalty_discount_per_point=float(s.loyalty_discount_per_point or 0.0),
                is_open=bool(s.is_open),
                is_accepting_orders=bool(s.is_accepting_orders),
                is_verified=bool(s.is_verified),
                is_active=bool(s.is_active),
                rating_avg=float(s.rating_avg or 0.0),
                rating_count=int(s.rating_count or 0),
                created_at=s.created_at,
            )
            for s in shops
        ]

    @strawberry.field
    async def shops_count(
        self,
        info: strawberry.Info,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count(Shop.id)).where(Shop.is_active.is_(True))
        if search:
            stmt = stmt.where(Shop.name.ilike(f"%{search}%"))
        res = await db_execute(info, stmt)
        count = res.scalar_one_or_none()
        return int(count or 0)

    @strawberry.field
    async def shop(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
    ) -> ShopType | None:
        stmt = select(Shop).where(Shop.id == str(id), Shop.is_active.is_(True))
        res = await db_execute(info, stmt)
        s = res.scalar_one_or_none()
        if not s:
            return None
        return ShopType(
            id=strawberry.ID(s.id),
            owner_id=s.owner_id,
            name=s.name,
            phone=s.phone,
            description=s.description,
            address_line=s.address_line,
            city=s.city,
            state=s.state,
            pincode=s.pincode,
            category=s.category,
            opening_hours=s.opening_hours,
            image_url=s.image_url,
            loyalty_discount_per_point=float(s.loyalty_discount_per_point or 0.0),
            is_open=bool(s.is_open),
            is_accepting_orders=bool(s.is_accepting_orders),
            is_verified=bool(s.is_verified),
            is_active=bool(s.is_active),
            rating_avg=float(s.rating_avg or 0.0),
            rating_count=int(s.rating_count or 0),
            created_at=s.created_at,
        )

    @strawberry.field
    async def my_orders(
        self,
        info: strawberry.Info,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[OrderType]:
        user = info.context.get("user")
        if not user:
            raise PermissionError("Not authenticated")

        db = info.context["db"]
        lock = info.context.get("db_lock")

        stmt = (
            select(Order)
            .where(Order.customer_id == user.id)
            .options(
                selectinload(Order.items),
                selectinload(Order.shop),
            )
        )
        if status:
            stmt = stmt.where(Order.status == status)

        stmt = (
            stmt.order_by(Order.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await db_execute(info, stmt)
        orders = res.scalars().all()
        orders_list = list(orders)

        if lock:
            async with lock:
                await populate_delivery_addresses(db, orders_list)
        else:
            await populate_delivery_addresses(db, orders_list)

        return [
            OrderType(
                id=strawberry.ID(o.id),
                order_number=o.order_number,
                customer_id=o.customer_id,
                shop_id=o.shop_id,
                shop_name=o.shop_name or (o.shop.name if o.shop else None),
                status=o.status,
                total_price=float(o.total_price),
                payment_method=o.payment_method,
                payment_status=o.payment_status,
                order_type=o.order_type,
                delivery_address=o.delivery_address,
                instructions=o.instructions,
                created_at=o.created_at,
                items=[
                    OrderItemType(
                        id=strawberry.ID(item.id),
                        item_id=item.item_id,
                        variant_id=item.variant_id,
                        item_name=item.item_name_snapshot or "Item",
                        variant_name=item.variant_name_snapshot,
                        quantity=int(item.quantity),
                        unit_price=float(item.unit_price),
                        total_price=float(item.unit_price * item.quantity),
                    )
                    for item in (o.items or [])
                ],
            )
            for o in orders_list
        ]

    @strawberry.field
    async def order(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
    ) -> OrderType | None:
        user = info.context.get("user")
        if not user:
            raise PermissionError("Not authenticated")

        db = info.context["db"]
        lock = info.context.get("db_lock")

        stmt = (
            select(Order)
            .where(Order.id == str(id))
            .options(
                selectinload(Order.items),
                selectinload(Order.shop),
            )
        )
        res = await db_execute(info, stmt)
        o = res.scalar_one_or_none()
        if not o:
            return None

        if user.role != "admin" and o.customer_id != user.id and (not o.shop or o.shop.owner_id != user.id):
            raise PermissionError("Forbidden")

        if lock:
            async with lock:
                await populate_delivery_addresses(db, [o])
        else:
            await populate_delivery_addresses(db, [o])

        return OrderType(
            id=strawberry.ID(o.id),
            order_number=o.order_number,
            customer_id=o.customer_id,
            shop_id=o.shop_id,
            shop_name=o.shop_name or (o.shop.name if o.shop else None),
            status=o.status,
            total_price=float(o.total_price),
            payment_method=o.payment_method,
            payment_status=o.payment_status,
            order_type=o.order_type,
            delivery_address=o.delivery_address,
            instructions=o.instructions,
            created_at=o.created_at,
            items=[
                OrderItemType(
                    id=strawberry.ID(item.id),
                    item_id=item.item_id,
                    variant_id=item.variant_id,
                    item_name=item.item_name_snapshot or "Item",
                    variant_name=item.variant_name_snapshot,
                    quantity=int(item.quantity),
                    unit_price=float(item.unit_price),
                    total_price=float(item.unit_price * item.quantity),
                )
                for item in (o.items or [])
            ],
        )


schema = strawberry.Schema(query=Query)
