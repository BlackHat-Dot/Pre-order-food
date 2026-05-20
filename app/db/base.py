from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

from app.models.user import User
from app.models.shop import Shop
from app.models.menu import MenuItem, MenuItemVariant
from app.models.order import Order, OrderItem
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction
from app.models.notification import Notification 
from app.models.coupon import Coupon 
from app.models.address import UserAddress