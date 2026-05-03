# models.py
from sqlalchemy import Column, Integer, String, JSON, DateTime
from datetime import datetime
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