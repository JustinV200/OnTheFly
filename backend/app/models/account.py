"""Stores the seeded business accounts used by the demo switcher.
This model covers profile identity only; it does not implement auth.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Account(Base):
    """Represents one marketplace business account."""

    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    handle: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    service_area: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
