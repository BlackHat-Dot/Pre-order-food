# main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from db import SessionLocal
from models import Shop
from schemas import ShopCreate,LoginRequest
from db import engine
from models import Base
from auth import password_hasher
from auth import verify_password, create_token
from fastapi import Header, HTTPException
from jose import jwt, JWTError
from auth import SECRET_KEY, ALGORITHM
from sqlalchemy.exc import IntegrityError
from pydantic import field_validator

Base.metadata.create_all(bind=engine)
app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_shop(authorization: str):
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        shop_id = payload.get("sub")
        return shop_id
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/shops")
def create_shop(shop: ShopCreate, db: Session = Depends(get_db)):
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
def login(data: LoginRequest, db: Session = Depends(get_db)):
    shop = db.query(Shop).filter(Shop.phone == data.phone).first()

    if not shop or not verify_password(data.password, shop.password):
        return {"error": "Invalid credentials"}

    token = create_token({"sub": str(shop.id)})

    return {"access_token": token, "token_type": "bearer"}

@app.get("/me")
def get_me(shop_id: str = Depends(get_current_shop)):
    return {"shop_id": shop_id}