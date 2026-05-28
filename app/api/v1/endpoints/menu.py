from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.menu import (
    MenuItem,
    MenuItemVariant,
)
from app.models.shop import Shop
from app.models.user import User
from app.schemas.menu import (
    MenuItemCreate,
    MenuItemOut,
    MenuItemUpdate,
    VariantCreate,
    VariantOut,
    VariantUpdate,
)
from app.services.cache import (
    cache_delete,
    cache_get_json,
    cache_set_json,
)
from app.utils.ids import new_id

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/menu",
    tags=["Menu"],
)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

async def clear_menu_cache(
    shop_id: str,
    item_id: str | None = None,
) -> None:

    keys = [
        f"menu:{shop_id}:*",
    ]

    if item_id:
        keys.append(
            f"menu:item:{item_id}"
        )

    await cache_delete(*keys)


async def get_shop_or_404(
    db: AsyncSession,
    shop_id: str,
) -> Shop:

    shop = await db.get(
        Shop,
        shop_id,
    )

    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found",
        )

    return shop


async def get_item_or_404(
    db: AsyncSession,
    item_id: str,
) -> MenuItem:

    stmt = (
        select(MenuItem)
        .where(MenuItem.id == item_id)
        .options(
            selectinload(
                MenuItem.variants
            )
        )
    )

    item = (
        await db.execute(stmt)
    ).scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Menu item not found",
        )

    return item


async def get_variant_or_404(
    db: AsyncSession,
    variant_id: str,
) -> MenuItemVariant:

    variant = await db.get(
        MenuItemVariant,
        variant_id,
    )

    if not variant:
        raise HTTPException(
            status_code=404,
            detail="Variant not found",
        )

    return variant


async def verify_shop_access(
    user: User,
    shop: Shop,
) -> None:

    if (
        user.role != "admin"
        and shop.owner_id != user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )


async def get_existing_item(
    db: AsyncSession,
    shop_id: str,
    name: str,
) -> MenuItem | None:

    stmt = select(MenuItem).where(
        MenuItem.shop_id == shop_id,
        MenuItem.name == name,
    )

    return (
        await db.execute(stmt)
    ).scalar_one_or_none()


async def get_existing_variant(
    db: AsyncSession,
    item_id: str,
    name: str,
) -> MenuItemVariant | None:

    stmt = select(
        MenuItemVariant
    ).where(
        MenuItemVariant.item_id
        == item_id,
        MenuItemVariant.name == name,
    )

    return (
        await db.execute(stmt)
    ).scalar_one_or_none()


# ─────────────────────────────────────────────────────────────
# Create Menu Item
# ─────────────────────────────────────────────────────────────

@router.post(
    "/shops/{shop_id}/items",
    response_model=MenuItemOut,
    status_code=201,
)
async def create_item(
    shop_id: str,
    payload: MenuItemCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> MenuItemOut:

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    existing_item = (
        await get_existing_item(
            db,
            shop_id,
            payload.name,
        )
    )

    if existing_item:

        if existing_item.is_available:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Menu item "
                    f"'{payload.name}' "
                    f"already exists"
                ),
            )

        for key, value in (
            payload.model_dump().items()
        ):
            setattr(
                existing_item,
                key,
                value,
            )

        existing_item.is_available = True

        item = existing_item

    else:
        item = MenuItem(
            id=new_id(),
            shop_id=shop_id,
            **payload.model_dump(),
        )

        db.add(item)

    await db.commit()

    item = await get_item_or_404(
        db,
        item.id,
    )

    await clear_menu_cache(
        shop_id,
        item.id,
    )

    return MenuItemOut.model_validate(
        item
    )


# ─────────────────────────────────────────────────────────────
# List Menu Items
# ─────────────────────────────────────────────────────────────

@router.get(
    "/shops/{shop_id}/items",
    response_model=list[MenuItemOut],
)
async def list_items(
    shop_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    page: int = Query(1, ge=1),
    page_size: int = Query(
        20,
        ge=1,
        le=100,
    ),
    category: str | None = None,
    dietary_type: str | None = None,
    available: bool | None = None,
) -> list[MenuItemOut]:

    cache_key = (
        f"menu:{shop_id}:"
        f"{page}:{page_size}:"
        f"{category}:{dietary_type}:{available}"
    )

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return [
            MenuItemOut.model_validate(
                item
            )
            for item in cached
        ]

    stmt = (
        select(MenuItem)
        .where(
            MenuItem.shop_id == shop_id
        )
        .options(
            selectinload(
                MenuItem.variants
            )
        )
    )

    if category:
        stmt = stmt.where(
            MenuItem.category.ilike(
                f"%{category}%"
            )
        )

    if dietary_type:
        stmt = stmt.where(
            MenuItem.dietary_type
            == dietary_type
        )

    if available is not None:
        stmt = stmt.where(
            MenuItem.is_available.is_(
                available
            )
        )

    stmt = (
        stmt.order_by(
            MenuItem.is_featured.desc(),
            MenuItem.created_at.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    items = (
        await db.execute(stmt)
    ).scalars().all()

    serialized = [
        MenuItemOut.model_validate(
            item
        ).model_dump(mode="json")
        for item in items
    ]

    await cache_set_json(
        cache_key,
        serialized,
        ttl_seconds=180,
    )

    return [
        MenuItemOut.model_validate(
            item
        )
        for item in serialized
    ]


# ─────────────────────────────────────────────────────────────
# Get Menu Item
# ─────────────────────────────────────────────────────────────

@router.get(
    "/items/{item_id}",
    response_model=MenuItemOut,
)
async def get_item(
    item_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> MenuItemOut:

    cache_key = (
        f"menu:item:{item_id}"
    )

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return MenuItemOut.model_validate(
            cached
        )

    item = await get_item_or_404(
        db,
        item_id,
    )

    serialized = (
        MenuItemOut.model_validate(
            item
        ).model_dump(mode="json")
    )

    await cache_set_json(
        cache_key,
        serialized,
        ttl_seconds=300,
    )

    return MenuItemOut.model_validate(
        serialized
    )


# ─────────────────────────────────────────────────────────────
# Update Menu Item
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/items/{item_id}",
    response_model=MenuItemOut,
)
async def update_item(
    item_id: str,
    payload: MenuItemUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> MenuItemOut:

    item = await get_item_or_404(
        db,
        item_id,
    )

    shop = await get_shop_or_404(
        db,
        item.shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    updates = payload.model_dump(
        exclude_unset=True
    )

    for key, value in updates.items():
        setattr(item, key, value)

    await db.commit()

    item = await get_item_or_404(
        db,
        item.id,
    )

    await clear_menu_cache(
        item.shop_id,
        item.id,
    )

    return MenuItemOut.model_validate(
        item
    )


# ─────────────────────────────────────────────────────────────
# Delete Menu Item
# ─────────────────────────────────────────────────────────────

@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_item(
    item_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> Response:

    item = await get_item_or_404(
        db,
        item_id,
    )

    shop = await get_shop_or_404(
        db,
        item.shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    shop_id = item.shop_id

    await db.delete(item)
    await db.commit()

    await clear_menu_cache(
        shop_id,
        item.id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )


# ─────────────────────────────────────────────────────────────
# Create Variant
# ─────────────────────────────────────────────────────────────

@router.post(
    "/items/{item_id}/variants",
    response_model=VariantOut,
    status_code=201,
)
async def create_variant(
    item_id: str,
    payload: VariantCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> VariantOut:

    item = await get_item_or_404(
        db,
        item_id,
    )

    shop = await get_shop_or_404(
        db,
        item.shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    existing_variant = (
        await get_existing_variant(
            db,
            item_id,
            payload.name,
        )
    )

    if existing_variant:

        if existing_variant.is_available:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Variant "
                    f"'{payload.name}' "
                    f"already exists"
                ),
            )

        for key, value in (
            payload.model_dump().items()
        ):
            setattr(
                existing_variant,
                key,
                value,
            )

        existing_variant.is_available = True

        variant = existing_variant

    else:
        variant = MenuItemVariant(
            id=new_id(),
            item_id=item_id,
            **payload.model_dump(),
        )

        db.add(variant)

    await db.commit()
    await db.refresh(variant)

    await clear_menu_cache(
        item.shop_id,
        item.id,
    )

    return VariantOut.model_validate(
        variant
    )


# ─────────────────────────────────────────────────────────────
# List Variants
# ─────────────────────────────────────────────────────────────

@router.get(
    "/items/{item_id}/variants",
    response_model=list[VariantOut],
)
async def list_variants(
    item_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> list[VariantOut]:

    stmt = (
        select(MenuItemVariant)
        .where(
            MenuItemVariant.item_id
            == item_id
        )
        .order_by(
            MenuItemVariant.created_at.desc()
        )
    )

    variants = (
        await db.execute(stmt)
    ).scalars().all()

    return [
        VariantOut.model_validate(
            variant
        )
        for variant in variants
    ]


# ─────────────────────────────────────────────────────────────
# Update Variant
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/variants/{variant_id}",
    response_model=VariantOut,
)
async def update_variant(
    variant_id: str,
    payload: VariantUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> VariantOut:

    variant = await get_variant_or_404(
        db,
        variant_id,
    )

    item = await get_item_or_404(
        db,
        variant.item_id,
    )

    shop = await get_shop_or_404(
        db,
        item.shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    updates = payload.model_dump(
        exclude_unset=True
    )

    for key, value in updates.items():
        setattr(
            variant,
            key,
            value,
        )

    await db.commit()
    await db.refresh(variant)

    await clear_menu_cache(
        item.shop_id,
        item.id,
    )

    return VariantOut.model_validate(
        variant
    )


# ─────────────────────────────────────────────────────────────
# Delete Variant
# ─────────────────────────────────────────────────────────────

@router.delete(
    "/variants/{variant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_variant(
    variant_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> Response:

    variant = await get_variant_or_404(
        db,
        variant_id,
    )

    item = await get_item_or_404(
        db,
        variant.item_id,
    )

    shop = await get_shop_or_404(
        db,
        item.shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    await db.delete(variant)
    await db.commit()

    await clear_menu_cache(
        item.shop_id,
        item.id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )