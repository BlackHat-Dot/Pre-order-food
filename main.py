# main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from models import Shop, Address
from schemas import ShopCreate,LoginRequest,CustomerCreate,CustomerLogin
from db import engine
from schemas import AddressCreate,MenuItemCreate
from models import Base,Customer
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
from models import Shop,Favorite,MenuItem

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
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = session.get(Shop, int(user_id))

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

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
        image_url=str(data.image_url) if data.image_url else None
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
def get_menu(shop_id: int, db: SessionDep):
    items = db.query(MenuItem).filter(
        MenuItem.shop_id == shop_id,
        MenuItem.is_available == True
    ).all()
    
    return [
        {
            "id": i.id,
            "name": i.name,
            "price": i.price,
            "category": i.category,
            "prep_time": i.prep_time
        }
        for i in items
    ]

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

@app.get("/shops/{shop_id}/menu")
def get_menu(shop_id: int, db: SessionDep):
    items = db.query(MenuItem).filter(
        MenuItem.shop_id == shop_id,
        MenuItem.is_available == True
    ).all()

    return items