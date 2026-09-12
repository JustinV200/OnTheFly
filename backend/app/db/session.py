"""Creates the SQLAlchemy engine and request-scoped database sessions.
This module is the only place that reads the configured database URL.
"""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_engine():
    """Return the configured SQLAlchemy engine singleton."""

    settings = get_settings()
    return create_engine(settings.database_url, future=True)


def get_session_factory() -> sessionmaker[Session]:
    """Return the session factory bound to the configured engine."""

    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """Yield a request-scoped database session for FastAPI dependencies."""

    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
