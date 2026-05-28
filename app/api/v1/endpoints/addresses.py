from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.address import UserAddress
from app.models.user import User
from app.schemas.address import AddressCreate, AddressOut
from app.utils.ids import new_id

router = APIRouter(prefix="/addresses", tags=["Addresses"])


async def get_user_address(
    db: AsyncSession,
    user_id: str,
    address_id: str,
) -> UserAddress:
    stmt = select(UserAddress).where(
        UserAddress.id == address_id,
        UserAddress.user_id == user_id,
    )

    address = (await db.execute(stmt)).scalar_one_or_none()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    return address


@router.post("", response_model=AddressOut, status_code=201)
async def add_address(
    payload: AddressCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing_stmt = select(UserAddress.id).where(
        UserAddress.user_id == user.id
    ).limit(1)

    existing = (await db.execute(existing_stmt)).scalar_one_or_none()

    address = UserAddress(
        id=new_id(),
        user_id=user.id,
        title=payload.title,
        address_line=payload.address_line,
        landmark=payload.landmark,
        is_default=existing is None,
    )

    db.add(address)

    await db.commit()
    await db.refresh(address)

    return address


@router.get("", response_model=list[AddressOut])
async def get_addresses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(UserAddress)
        .where(UserAddress.user_id == user.id)
        .order_by(UserAddress.is_default.desc())
    )

    return (await db.execute(stmt)).scalars().all()


@router.put("/{address_id}/default")
async def set_default_address(
    address_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = await get_user_address(db, user.id, address_id)

    await db.execute(
        update(UserAddress)
        .where(UserAddress.user_id == user.id)
        .values(is_default=False)
    )

    address.is_default = True

    await db.commit()

    return {"message": "Default address updated"}


@router.delete("/{address_id}")
async def delete_address(
    address_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = await get_user_address(db, user.id, address_id)

    was_default = address.is_default

    await db.delete(address)
    await db.commit()

    if was_default:
        stmt = (
            select(UserAddress)
            .where(UserAddress.user_id == user.id)
            .limit(1)
        )

        next_address = (await db.execute(stmt)).scalar_one_or_none()

        if next_address:
            next_address.is_default = True
            await db.commit()

    return {"message": "Address deleted"}