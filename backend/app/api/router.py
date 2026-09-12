"""Composes the application's API routers in one place.
Each feature router owns its endpoints; this file only wires them together.
"""

from fastapi import APIRouter

from app.api.inbox.router import router as inbox_router
from app.api.challenges.router import router as challenges_router
from app.api.expenses.router import router as expenses_router
from app.api.listings.router import router as listings_router
from app.api.marketplace.router import router as marketplace_router
from app.api.profiles.router import router as profiles_router

api_router = APIRouter()
api_router.include_router(challenges_router)
api_router.include_router(expenses_router)
api_router.include_router(inbox_router)
api_router.include_router(listings_router)
api_router.include_router(marketplace_router)
api_router.include_router(profiles_router)
