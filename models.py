# models.py
from sqlalchemy import Column, Integer,ForeignKey, String, JSON, DateTime,Float,Date
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Boolean
from db import Base

class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)  # NEW
    address = Column(String, nullable=False)
    opening_hours = Column(String)
    categories = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_open = Column(Boolean, default=False, nullable=False)
    is_accepting_orders = Column(Boolean, default=True, nullable=False)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=True, unique=True)
    password = Column(String, nullable=False)  # NEW
    created_at = Column(DateTime, default=datetime.utcnow)

class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    line1 = Column(String, nullable=False)
    line2 = Column(String, nullable=True)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    pincode = Column(String, nullable=False)

    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer")

# models.py
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, DateTime
from datetime import datetime

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("customer_id", "shop_id", name="uix_customer_shop"),
    )

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)

    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    prep_time = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_available = Column(Boolean, default=True, nullable=False)
    is_special = Column(Boolean, default=False, nullable=False)
    special_date = Column(Date, nullable=True)  # which day it is special
    dietary_type = Column(String, nullable=False) 

class MenuItemVariant(Base):
    __tablename__ = "menu_item_variants"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)

    name = Column(String, nullable=False)  # small / medium / large
    price = Column(Float, nullable=False)
    prep_time = Column(Integer, nullable=False)  # can differ per size

    created_at = Column(DateTime, default=datetime.utcnow)

# models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from datetime import datetime

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)

    status = Column(String, default="pending")  # state machine
    total_price = Column(Float, nullable=False)

    prep_time = Column(Integer, nullable=False)  # computed
    scheduled_time = Column(DateTime, nullable=True)  # pickup time

    instructions = Column(String, nullable=True)
    payment_method = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)

    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("menu_items.id"))
    variant_id = Column(Integer, ForeignKey("menu_item_variants.id"))

    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)  # snapshot price