"""Stores one market-data retrieval behind a Ways to save card: awards and suppliers, or public labor rates.
Every row keeps source, query, time, status and limitations; "unavailable" renders as not checked (roadmap 12, step 8).
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MarketEvidence(Base):
    """One retrieval's result and its limits."""

    __tablename__ = "market_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    # suppliers | labor_rates
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    # The source's name, e.g. "demo_market_data" or "usaspending_awards".
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    # demo_data | public_api. Demo data is labeled on every card that uses it.
    provenance: Mapped[str] = mapped_column(String(16), nullable=False)
    # JSON of the query inputs (PSC, NAICS, place of performance, lookback, labor category).
    query_json: Mapped[str] = mapped_column(Text, nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    # ok | no_match | unavailable
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    # JSON result: award records (ids, UEIs, amounts in minor units, URLs) or rate percentiles in minor units.
    result_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    limitations: Mapped[str] = mapped_column(Text, nullable=False)
