"""Composes the application's API routers in one place.
Each feature router owns its endpoints; this file only wires them together.
"""

from fastapi import APIRouter

from app.api.expenses.router import router as expenses_router

api_router = APIRouter()
api_router.include_router(expenses_router)
