from __future__ import annotations

from typing import Annotated

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.menu import MenuItem, MenuItemVariant
from app.models.shop import Shop
from app.models.user import User
from app.schemas.menu import MenuItemCreate, MenuItemOut, MenuItemUpdate, VariantCreate, VariantOut, VariantUpdate
from app.services.cache import cache_delete, cache_get_json, cache_set_json
from app.utils.ids import new_id


router = APIRouter(prefix="/menu", tags=["Menu"])


@router.post("/shops/{shop_id}/items", response_model=MenuItemOut, status_code=201)
async def create_item(
    shop_id: str,
    payload: MenuItemCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> MenuItemOut:
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")

    # 🚀 FIX: Check if an item with the same name already exists in this shop
    stmt_exist = select(MenuItem).where(
        MenuItem.shop_id == shop_id,
        MenuItem.name == payload.name
    )
    result_exist = await db.execute(stmt_exist)
    existing_item = result_exist.scalar_one_or_none()

    if existing_item:
        # If the item exists but is unavailable, repurpose/reactivate it with the new info!
        if not existing_item.is_available:
            for k, v in payload.model_dump().items():
                setattr(existing_item, k, v)
            existing_item.is_available = True  # Make it active again
            item_id = existing_item.id
        else:
            # If it's already active, prevent a messy unique constraint collision explicitly
            raise HTTPException(
                status_code=400, 
                detail=f"An active menu item named '{payload.name}' already exists in this shop."
            )
    else:
        # Standard flow: Create a brand new unique record
        item_id = new_id()
        item = MenuItem(id=item_id, shop_id=shop_id, **payload.model_dump())
        db.add(item)

    await db.commit()

    # Eagerly fetch with variants to return a clean payload schema
    result = await db.execute(
        select(MenuItem).where(MenuItem.id == item_id).options(selectinload(MenuItem.variants))
    )
    item = result.scalar_one()

    await cache_delete_pattern(f"menu:{shop_id}:")
    return MenuItemOut.model_validate(item)


@router.get("/shops/{shop_id}/items", response_model=list[MenuItemOut])
async def list_items(
    shop_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    dietary_type: str | None = None,
    # 🚀 FIXED: Default parameter changed to None so unavailable items are not pre-filtered out
    available: bool | None = None,
) -> list[MenuItemOut]:
    key = f"menu:{shop_id}:{page}:{page_size}:{category}:{dietary_type}:{available}"
    logging.debug("Menu list request for shop %s page=%s page_size=%s category=%s available=%s", shop_id, page, page_size, category, available)
    cached = await cache_get_json(key)
    if cached:
        return [MenuItemOut.model_validate(x) for x in cached]

    stmt = select(MenuItem).where(MenuItem.shop_id == shop_id).options(selectinload(MenuItem.variants))
    if category:
        stmt = stmt.where(MenuItem.category.ilike(f"%{category}%"))
    if dietary_type:
        stmt = stmt.where(MenuItem.dietary_type == dietary_type)
    if available is not None:
        stmt = stmt.where(MenuItem.is_available.is_(available))
        
    stmt = stmt.order_by(MenuItem.is_featured.desc(), MenuItem.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    payload = [MenuItemOut.model_validate(r).model_dump(mode="json") for r in rows]
    await cache_set_json(key, payload, ttl_seconds=180)
    return [MenuItemOut.model_validate(x) for x in payload]


@router.get("/items/{item_id}", response_model=MenuItemOut)
async def get_item(item_id: str, db: Annotated[AsyncSession, Depends(get_db)]) -> MenuItemOut:
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id).options(selectinload(MenuItem.variants)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Menu item not found")
    return MenuItemOut.model_validate(item)


@router.patch("/items/{item_id}", response_model=MenuItemOut)
async def update_item(
    item_id: str,
    payload: MenuItemUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> MenuItemOut:
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    shop = await db.get(Shop, item.shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()

    result = await db.execute(
        select(MenuItem).where(MenuItem.id == item.id).options(selectinload(MenuItem.variants))
    )
    item = result.scalar_one()

    await cache_delete_pattern(f"menu:{item.shop_id}:")
    return MenuItemOut.model_validate(item)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> Response:
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    shop = await db.get(Shop, item.shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")
    shop_id = item.shop_id
    await db.delete(item)
    await db.commit()
    await cache_delete_pattern(f"menu:{shop_id}:")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/items/{item_id}/variants", response_model=VariantOut, status_code=201)
async def create_variant(
    item_id: str,
    payload: VariantCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> VariantOut:
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    shop = await db.get(Shop, item.shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")

    # 🚀 FIX: Check if a variant option with the same name already exists for this dish
    stmt_exist = select(MenuItemVariant).where(
        MenuItemVariant.item_id == item_id,
        MenuItemVariant.name == payload.name
    )
    result_exist = await db.execute(stmt_exist)
    existing_variant = result_exist.scalar_one_or_none()

    if existing_variant:
        # If it exists but is currently unavailable, reactivate and update its details
        if not existing_variant.is_available:
            for k, v in payload.model_dump().items():
                setattr(existing_variant, k, v)
            existing_variant.is_available = True  # Make it active again
            variant = existing_variant
        else:
            # If it's already active, prevent a constraint collision explicitly
            raise HTTPException(
                status_code=400, 
                detail=f"An active option named '{payload.name}' already exists for this item."
            )
    else:
        # Standard flow: Create a brand new unique variant row record
        variant = MenuItemVariant(id=new_id(), item_id=item_id, **payload.model_dump())
        db.add(variant)

    await db.commit()
    await db.refresh(variant)
    await cache_delete_pattern(f"menu:{item.shop_id}:")
    return VariantOut.model_validate(variant)


@router.get("/items/{item_id}/variants", response_model=list[VariantOut])
async def list_variants(item_id: str, db: Annotated[AsyncSession, Depends(get_db)]) -> list[VariantOut]:
    result = await db.execute(select(MenuItemVariant).where(MenuItemVariant.item_id == item_id).order_by(MenuItemVariant.created_at.desc()))
    return [VariantOut.model_validate(v) for v in result.scalars().all()]


@router.patch("/variants/{variant_id}", response_model=VariantOut)
async def update_variant(
    variant_id: str,
    payload: VariantUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> VariantOut:
    variant = await db.get(MenuItemVariant, variant_id)
    if not variant:
        raise HTTPException(404, "Variant not found")
    item = await db.get(MenuItem, variant.item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    shop = await db.get(Shop, item.shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(variant, k, v)
    await db.commit()
    await db.refresh(variant)
    await cache_delete_pattern(f"menu:{item.shop_id}:")
    return VariantOut.model_validate(variant)


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    variant_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> Response:
    variant = await db.get(MenuItemVariant, variant_id)
    if not variant:
        raise HTTPException(404, "Variant not found")
    item = await db.get(MenuItem, variant.item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    shop = await db.get(Shop, item.shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")
    await db.delete(variant)
    await db.commit()
    await cache_delete_pattern(f"menu:{item.shop_id}:")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def cache_delete_pattern(prefix: str) -> None:
    await cache_delete(prefix + "*")