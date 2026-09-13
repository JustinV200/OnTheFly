"""Stores addresses that opted out of invitations, across every listing and owner.
An opt-out is keyed by the normalized address alone, so no future listing can invite it again.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OutreachSuppression(Base):
    """Represents one address that must never receive an invitation."""

    __tablename__ = "outreach_suppressions"

    # Lowercased, the same normalization candidates store, so the lookup is exact equality.
    email: Mapped[str] = mapped_column(String(255), primary_key=True)
    opted_out_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    # How the opt-out arrived; today only the link in the invitation footer.
    via: Mapped[str] = mapped_column(String(32), nullable=False, default="opt_out_link")
