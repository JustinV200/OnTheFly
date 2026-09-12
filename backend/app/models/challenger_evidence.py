"""Stores named challenger evidence checks without collapsing them into a badge.
Each check retains its own status, source, timestamp, and limitations.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChallengerEvidence(Base):
    """Represents the latest stored evidence bundle for one challenge."""

    __tablename__ = "challenger_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"), nullable=False, index=True)
    challenger_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    platform_check: Mapped[str] = mapped_column(Text, nullable=False)
    identity_check: Mapped[str] = mapped_column(Text, nullable=False)
    registry_check: Mapped[str] = mapped_column(Text, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
