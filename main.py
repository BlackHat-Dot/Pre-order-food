# main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from models import Shop
from schemas import ShopCreate,LoginRequest,CustomerCreate
from db import engine
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
from models import Shop
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login/")

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

@app.post("/login/")
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