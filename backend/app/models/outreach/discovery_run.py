"""Records every provider discovery run, including runs whose source was unavailable or failed.
A failed run is stored with zero counts so "not run" never reads as "found nothing".
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DiscoveryRun(Base):
    """Represents one owner-triggered discovery search and what its filters did."""

    __tablename__ = "discovery_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("public_listings.id"), nullable=False, index=True)
    ran_by_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    # ok | unavailable | error
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON array of the query strings sent, so a run is reproducible when debugging the filters.
    queries: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    found_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dropped_aggregator_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    merged_duplicate_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    new_candidate_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ran_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
