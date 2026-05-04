# main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from models import Shop, Address, Order
from schemas import ShopCreate,LoginRequest,CustomerCreate,CustomerLogin
from db import engine
from schemas import AddressCreate,MenuItemCreate,BatchAvailabilityUpdate
from schemas import SetDailySpecial,AddVariants,OrderCreate
from models import Base,Customer,OrderItem
from auth import password_hasher
from auth import verify_password, create_token
from fastapi import Header, HTTPException
from jose import jwt, JWTError
from auth import SECRET_KEY, ALGORITHM
from sqlalchemy.exc import IntegrityError
from pydantic import field_validator
from typing import Annotated
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import JWTException
from contextlib import asynccontextmanager
from init_db import create_db_and_tables
from fastapi.responses import RedirectResponse
from models import Shop,Favorite,MenuItem,MenuItemVariant
from datetime import date

#oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/customers/login")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_session(): #done
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

@asynccontextmanager
async def lifespan(app: FastAPI): #done
    Base.metadata.create_all(bind=engine)#func is executed and yield is executed and the func is paused
    yield

app = FastAPI(lifespan=lifespan)


def get_current_shop(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: SessionDep
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")

        if not sub or sub.startswith("customer:"):
            raise HTTPException(401, "Invalid shop token")

        shop_id = int(sub)

    except:
        raise HTTPException(401, "Invalid token")

    user = session.get(Shop, shop_id)

    if not user:
        raise HTTPException(401, "Shop not found")

    return user

def get_current_customer(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: SessionDep
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")

        if not sub or not sub.startswith("customer:"):
            raise HTTPException(401, "Invalid token")

        user_id = int(sub.split(":")[1])

    except JWTError:
        raise HTTPException(401, "Invalid token")

    user = db.get(Customer, user_id)

    if not user:
        raise HTTPException(401, "User not found")

    return user

@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    return RedirectResponse(url="/docs")

@app.post("/shops")
def create_shop(shop: ShopCreate, db:SessionDep):
    new_shop = Shop(
        name=shop.name,
        phone=shop.phone,
        password=password_hasher(shop.password),
        address=shop.address,
        opening_hours=shop.opening_hours,
        categories=shop.categories
    )

    try:
        db.add(new_shop)
        db.commit()
        db.refresh(new_shop)

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422,detail="Phone number already exist")
    return {"id": new_shop.id, "message": "Shop registered"}

@app.post("/login")
def login(data: Annotated[OAuth2PasswordRequestForm, Depends()], db: SessionDep):
    shop = db.query(Shop).filter(Shop.phone == data.username).first()

    if not shop or not verify_password(data.password, shop.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"sub": str(shop.id)})

    return {"access_token": token, "token_type": "bearer"}

@app.get("/me")
def get_me(shop: Shop = Depends(get_current_shop)):
    return {"id": shop.id, "name": shop.name,"status":shop.is_open
            ,"accepting_orders":shop.is_accepting_orders}

@app.patch("/shops/me/status")
def update_status(
    is_open: bool,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop)):
        print(shop)
        shop.is_open = is_open
        db.add(shop)
        db.commit()
        db.refresh(shop)

        return {
        "shop_id": shop.id,
        "is_open": shop.is_open
        }

@app.patch("/shops/me/orders")
def set_order_acceptance(
    accept: bool,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop)
):
    if not shop.is_open:
        raise HTTPException(400, "Shop is closed")

    shop.is_accepting_orders = accept
    db.add(shop)
    db.commit()
    db.refresh(shop)

    return {
        "shop_id": shop.id,
        "is_accepting_orders": shop.is_accepting_orders
    }

@app.post("/customers")
def create_customer(data: CustomerCreate, db: SessionDep):
    customer = Customer(
        name=data.name,
        phone=data.phone,
        email=data.email,
        password=password_hasher(data.password))

    try:
            db.add(customer)
            db.commit()
            db.refresh(customer)
    
    except IntegrityError as e:
        db.rollback()
    
        msg = str(e.orig)
        print(msg)
        if "customers.phone" in msg:
            raise HTTPException(400, "Phone number already registered")
        if "customers.email" in msg:
            raise HTTPException(400, "Email already registered")
    
        raise HTTPException(400, "Integrity error")
    
    return {"id": customer.id}


from fastapi.security import OAuth2PasswordRequestForm

@app.post("/customers/login")
def customer_login(
    db: SessionDep,
    form: OAuth2PasswordRequestForm = Depends()
):
    user = db.query(Customer).filter(Customer.phone == form.username).first()

    if not user or not verify_password(form.password, user.password):
        raise HTTPException(401, "Invalid credentials")

    token = create_token({"sub": f"customer:{user.id}"})

    return {"access_token": token, "token_type": "bearer"}

@app.get("/customers/me")
def me(user: Customer = Depends(get_current_customer)):
    return {"id": user.id, "phone": user.phone}

@app.post("/customers/addresses")
def add_address(
    data: AddressCreate,
    db: SessionDep,
    user: Customer = Depends(get_current_customer),
):
    if data.is_default:
        db.query(Address).filter(Address.customer_id == user.id).update(
            {"is_default": False}
        )

    addr = Address(
        customer_id=user.id,
        line1=data.line1,
        line2=data.line2,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        is_default=data.is_default
    )

    db.add(addr)
    db.commit()
    db.refresh(addr)

    return {"id": addr.id}

@app.get("/customers/addresses")
def list_addresses(
    db: SessionDep,
    user: Customer = Depends(get_current_customer), 
):
    addresses = db.query(Address).filter(Address.customer_id == user.id).all()

    return addresses

@app.patch("/customers/addresses/{addr_id}/default")
def set_default(
    addr_id: int,
    db: SessionDep,
    user: Customer = Depends(get_current_customer)
):
    addr = db.get(Address, addr_id)

    if not addr or addr.customer_id != user.id:
        raise HTTPException(404, "Address not found")

    db.query(Address).filter(Address.customer_id == user.id).update(
        {"is_default": False}
    )

    addr.is_default = True
    db.commit()

    return {"message": "Default updated"}

@app.post("/customers/favorites/{shop_id}")
def add_favorite(
    shop_id: int,
    db: SessionDep,
    user: Customer = Depends(get_current_customer),
):
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")

    fav = Favorite(customer_id=user.id, shop_id=shop_id)

    try:
        db.add(fav)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Already in favorites")

    return {"message": "Added to favorites"}

@app.delete("/customers/favorites/{shop_id}")
def remove_favorite(
    shop_id: int,
    db: SessionDep,
    user: Customer = Depends(get_current_customer),
):
    fav = db.query(Favorite).filter(
        Favorite.customer_id == user.id,
        Favorite.shop_id == shop_id
    ).first()

    if not fav:
        raise HTTPException(404, "Favorite not found")

    db.delete(fav)
    db.commit()

    return {"message": "Removed"}

@app.get("/customers/favorites")
def list_favorites(
    db: SessionDep,
    user: Customer = Depends(get_current_customer),
):
    favs = db.query(Favorite).filter(Favorite.customer_id == user.id).all()

    shop_ids = [f.shop_id for f in favs]

    shops = db.query(Shop).filter(Shop.id.in_(shop_ids)).all()

    return [{"id": s.id, "name": s.name} for s in shops]

@app.post("/shops/menu")
def add_menu_item(
    data: MenuItemCreate,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop)
):
    item = MenuItem(
        shop_id=shop.id,
        name=data.name,
        description=data.description,
        price=data.price,
        category=data.category,
        prep_time=data.prep_time,
        image_url=str(data.image_url) if data.image_url else None,
        dietary_type=data.dietary_type
)

    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=401,detail="item already exist")
    return {"id": item.id}


@app.get("/shops/{shop_id}/menu")
def get_menu(
    shop_id: int,
    db: SessionDep,
    dietary: str | None = None,
):
    query = db.query(MenuItem).filter(
        MenuItem.shop_id == shop_id,
        MenuItem.is_available == True
    )

    if dietary:
        query = query.filter(MenuItem.dietary_type == dietary)

    items = query.all()
    result = []

    for i in items:
        variants = db.query(MenuItemVariant).filter(
            MenuItemVariant.item_id == i.id
        ).all()

        if variants:
            result.append({
                "id": i.id,
                "name": i.name,
                "has_variants": True,
                "variants": [
                    {
                        "id": v.id,
                        "name": v.name,
                        "price": v.price,
                        "prep_time": v.prep_time
                    }
                    for v in variants
                ]
            })
        else:
            result.append({
                "id": i.id,
                "name": i.name,
                "price": i.price,
                "prep_time": i.prep_time,
                "has_variants": False
            })

    return result

@app.delete("/shops/menu/{item_id}")
def delete_item(
    item_id: int,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop),
    
):
    item = db.get(MenuItem, item_id)

    if not item or item.shop_id != shop.id:
        raise HTTPException(404, "Item not found")

    db.delete(item)
    db.commit()

    return {"message": "Deleted"}

@app.patch("/shops/menu/{item_id}/availability")
def set_availability(
    item_id: int,
    available: bool,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop)
):
    item = db.get(MenuItem, item_id)

    if not item or item.shop_id != shop.id:
        raise HTTPException(404, "Item not found")

    item.is_available = available
    db.commit()
    db.refresh(item)

    return {
        "item_id": item.id,
        "is_available": item.is_available
    }


from sqlalchemy import update
@app.patch("/shops/menu/batch-availability")
def batch_set_availability(
    data: BatchAvailabilityUpdate,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop),
    
):
    # update only items that belong to this shop
    stmt = (
        update(MenuItem)
        .where(
            MenuItem.shop_id == shop.id,
            MenuItem.id.in_(data.item_ids)
        )
        .values(is_available=data.available)
    )

    result = db.execute(stmt)
    db.commit()

    updated = result.rowcount or 0

    # optional strictness: ensure all requested ids belonged to the shop
    if updated != len(data.item_ids):
        raise HTTPException(
            status_code=404,
            detail="Some items not found or not owned by this shop"
        )

    return {
        "updated_count": updated,
        "is_available": data.available
    }

@app.patch("/shops/menu/daily-specials")
def set_daily_specials(
    data: SetDailySpecial,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop)
):
    # clear previous specials for that date
    db.execute(
        update(MenuItem)
        .where(
            MenuItem.shop_id == shop.id,
            MenuItem.special_date == data.special_date
        )
        .values(is_special=False, special_date=None)
    )

    # set new specials
    result = db.execute(
        update(MenuItem)
        .where(
            MenuItem.shop_id == shop.id,
            MenuItem.id.in_(data.item_ids)
        )
        .values(is_special=True, special_date=data.special_date)
    )

    db.commit()

    return {
        "special_date": data.special_date,
        "count": result.rowcount
    }

@app.get("/shops/{shop_id}/specials")
def get_specials(shop_id: int, db: SessionDep):
    today = date.today()

    items = db.query(MenuItem).filter(
        MenuItem.shop_id == shop_id,
        MenuItem.is_special == True,
        MenuItem.special_date == today
    ).all()

    return items

# main.py
@app.post("/shops/menu/{item_id}/variants")
def add_variants(
    item_id: int,
    data: AddVariants,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop)
):
    item = db.get(MenuItem, item_id)

    if not item or item.shop_id != shop.id:
        raise HTTPException(404, "Item not found")

    created = []

    for v in data.variants:
        variant = MenuItemVariant(
            item_id=item_id,
            name=v.name,
            price=v.price,
            prep_time=v.prep_time
        )
        db.add(variant)
        created.append(variant)

    db.commit()

    return {"count": len(created)}

@app.post("/orders")
def create_order(
    data: OrderCreate,
    db: SessionDep,
    user: Customer = Depends(get_current_customer),
):

    total = 0
    prep_times = []

    for i in data.items:

        
        if i.variant_id:
            v = db.get(MenuItemVariant, i.variant_id)
            if not v:
                raise HTTPException(400, "Invalid variant")

            
            item = db.get(MenuItem, v.item_id)
            if item.shop_id != data.shop_id:
                raise HTTPException(400, "Variant does not belong to this shop")

            total += v.price * i.quantity
            prep_times.append(v.prep_time)

       
        else:
            item = db.get(MenuItem, i.item_id)
            if not item:
                raise HTTPException(400, "Invalid item")

            
            if item.shop_id != data.shop_id:
                raise HTTPException(400, "Item does not belong to this shop")

            total += item.price * i.quantity
            prep_times.append(item.prep_time)

    prep_time = max(prep_times)

@app.patch("/orders/{order_id}/status")
def update_status(
    order_id: int,
    status: str,
    db: SessionDep,
    shop: Shop = Depends(get_current_shop),
    
):
    order = db.get(Order, order_id)

    if not order or order.shop_id != shop.id:
        raise HTTPException(404, "Order not found")

    valid = {
        "pending": ["accepted", "cancelled"],
        "accepted": ["preparing", "cancelled"],
        "preparing": ["ready"],
        "ready": ["completed"]
    }

    if status not in valid.get(order.status, []):
        raise HTTPException(400, "Invalid transition")

    order.status = status
    db.commit()

    return {"status": order.status}

@app.get("/customers/orders")
def get_my_orders(
    db: SessionDep,
    user: Customer = Depends(get_current_customer),
    
):
    orders = db.query(Order).filter(
        Order.customer_id == user.id
    ).order_by(Order.created_at.desc()).all()

    return [
        {
            "order_id": o.id,
            "status": o.status,
            "total_price": o.total_price,
            "prep_time": o.prep_time,
            "scheduled_time": o.scheduled_time,
            "created_at": o.created_at
        }
        for o in orders
    ]

@app.get("/customers/orders/{order_id}")
def get_order(
    order_id: int,
    db: SessionDep,
    user: Customer = Depends(get_current_customer),
    
):
    order = db.get(Order, order_id)

    if not order or order.customer_id != user.id:
        raise HTTPException(404, "Order not found")

    items = db.query(OrderItem).filter(
        OrderItem.order_id == order.id
    ).all()

    return {
        "order_id": order.id,
        "status": order.status,
        "total_price": order.total_price,
        "prep_time": order.prep_time,
        "scheduled_time": order.scheduled_time,
        "payment_method": order.payment_method,
        "instructions": order.instructions,
        "items": [
            {
                "variant_id": i.variant_id,
                "item_id": i.item_id,
                "quantity": i.quantity,
                "price": i.price
            }
            for i in items
        ]
    }