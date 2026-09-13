"""Re-attaches UTC to timestamps SQLite returns without a zone, so stored times compare correctly."""

from datetime import datetime, timezone


def as_utc(value: datetime) -> datetime:
    """Return the datetime as timezone-aware UTC; a naive value is assumed to be UTC, as every stored time is."""

    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
