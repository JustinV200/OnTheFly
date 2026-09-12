"""Builds the FastAPI application and registers shared infrastructure.
This module wires routes and handlers; business logic lives elsewhere.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.db.seed import SEEDED_ACCOUNTS, run_seed
from app.db.session import get_session_factory
from app.models import Account


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Seed demo accounts on startup when the accounts table is available."""

    db = get_session_factory()()
    try:
        run_seed(db)
    except OperationalError:
        db.rollback()
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""

    settings = get_settings()
    app = FastAPI(title="Marketplace Backend", version=settings.app_version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(api_router)

    @app.get("/health")
    def health() -> dict[str, int | str]:
        """Return a simple readiness payload for local development and tests."""

        account_count = _count_accounts()
        return {
            "status": "ok",
            "version": settings.app_version,
            "transaction_source": settings.transaction_source,
            "account_count": account_count,
        }

    return app


def _count_accounts() -> int:
    db = get_session_factory()()
    try:
        count_query = select(func.count()).select_from(Account)
        return int(db.scalar(count_query) or 0)
    except OperationalError:
        return len(SEEDED_ACCOUNTS)
    finally:
        db.close()


app = create_app()
