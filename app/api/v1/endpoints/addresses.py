from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from app.db.session import get_db
from app.models.address import UserAddress
from app.models.user import User
from app.schemas.address import AddressCreate, AddressOut
from app.core.deps import get_current_user
from app.utils.ids import new_id

router = APIRouter(prefix="/addresses", tags=["Addresses"])

@router.post("", response_model=AddressOut, status_code=201)
async def add_address(
    payload: AddressCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Check if this is the user's first address—if so, default it automatically
    stmt = select(UserAddress).where(UserAddress.user_id == user.id)
    existing = (await db.execute(stmt)).scalars().all()
    should_be_default = len(existing) == 0

    new_address = UserAddress(
        id=new_id(),
        user_id=user.id,
        title=payload.title,
        address_line=payload.address_line,
        landmark=payload.landmark,
        is_default=should_be_default
    )
    db.add(new_address)
    await db.commit()
    await db.refresh(new_address)
    return new_address

@router.get("", response_model=list[AddressOut])
async def get_my_addresses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = select(UserAddress).where(UserAddress.user_id == user.id).order_by(UserAddress.is_default.desc())
    return (await db.execute(stmt)).scalars().all()

@router.put("/{address_id}/default", status_code=200)
async def set_default_address(
    address_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Verify address belongs to user
    addr = await db.get(UserAddress, address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(404, "Address entry records not located")
        
    # Clear old defaults
    await db.execute(update(UserAddress).where(UserAddress.user_id == user.id).values(is_default=False))
    
    # Secure fresh selection choice default flag
    addr.is_default = True
    await db.commit()
    return {"message": "Successfully updated system default delivery point specifications"}

@router.delete("/{address_id}", status_code=200)
async def delete_saved_address(
    address_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    addr = await db.get(UserAddress, address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(404, "Target address entry not located")
        
    await db.delete(addr)
    await db.commit()
    return {"message": "Successfully removed destination address from customer record map"}