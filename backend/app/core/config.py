"""Loads environment configuration once for the backend.
This module owns env parsing so other modules receive typed settings only.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from environment variables."""

    database_url: str = "sqlite:///./dev.db"
    transaction_source: str = "fixture"
    rho_api_key: str = ""
    rho_base_url: str = "https://api.rho.co"
    claude_api_key: str = ""
    # Current default Claude model as of 2026-09-12. Nothing calls the API yet, so re-confirm
    # the ID when the first AI feature lands (CLAUDE.md: confirm during implementation).
    claude_model: str = "claude-opus-5"
    app_version: str = "0.1.0"
    # Comma-separated allowed CORS origins; defaults to local dev frontend
    cors_allow_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=False,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton settings object for the current process."""

    return Settings()
