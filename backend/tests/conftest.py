"""Shared pytest fixtures for backend tests.
Tests use a repository-local SQLite file instead of external infrastructure.
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db.seed import run_seed
from app.db.session import get_engine
from app.main import create_app
from app.models import Account

TEST_DB_PATH = Path("test_backend.db")
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"


def _release_engine() -> None:
    """Dispose the cached app engine before clearing its cache entry.

    Clearing the lru_cache alone only drops the reference; the pooled SQLite
    connection stays open until garbage collection, which on Windows holds a
    file lock and makes the test database undeletable (WinError 32).
    """

    get_engine().dispose()
    get_settings.cache_clear()
    get_engine.cache_clear()


@pytest.fixture(autouse=True)
def reset_settings_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    """Point settings at a fresh local test database for each test."""

    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    monkeypatch.setenv("TRANSACTION_SOURCE", "fixture")
    # Environment beats a developer's .env, so no test can reach Tavily or a real mail server by accident.
    monkeypatch.setenv("DISCOVERY_SOURCE", "fixture")
    monkeypatch.setenv("TAVILY_API_KEY", "")
    monkeypatch.setenv("OUTREACH_CHANNEL", "sandbox")
    monkeypatch.setenv("OUTREACH_POSTAL_ADDRESS", "")
    monkeypatch.setenv("OUTREACH_RECIPIENT_ALLOWLIST", "")
    monkeypatch.setenv("SMTP_HOST", "")
    get_settings.cache_clear()
    get_engine.cache_clear()
    yield
    _release_engine()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture()
def db_session():
    """Create schema and seeded accounts in the test database."""

    engine = create_engine(TEST_DATABASE_URL, future=True)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    db = TestingSessionLocal()
    try:
        _ = Account
        run_seed(db)
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """Return a TestClient backed by the seeded test database."""

    _ = db_session
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
