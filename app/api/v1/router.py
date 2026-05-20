from fastapi import APIRouter

from app.api.v1.endpoints import coupons, admin, auth, loyalty, menu, orders, payments, reviews, shops, users, verification, notification
from app.api.v1.endpoints.addresses import router as addresses

api_router = APIRouter()

api_router.include_router(verification.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(shops.router)
api_router.include_router(menu.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(reviews.router)
api_router.include_router(loyalty.router)
api_router.include_router(admin.router)
api_router.include_router(notification.router)
api_router.include_router(coupons.router)
api_router.include_router(addresses)