from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, loyalty, menu, orders, payments, reviews, shops, users

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(shops.router)
api_router.include_router(menu.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(reviews.router)
api_router.include_router(loyalty.router)
api_router.include_router(admin.router)

