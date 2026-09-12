"""Re-exports SQLAlchemy models so metadata registration is explicit."""

from app.models.account import Account

__all__ = ["Account"]
