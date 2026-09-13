"""Stores one Ways to save card: a segment's inputs, computed costs, thresholds, tier and status (roadmap 12, step 9).
Inputs are stored whole so the card's integer results can be recomputed exactly from what it recorded.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SavingsCard(Base):
    """One segment of a task's retained requirements, priced three ways for its owner."""

    __tablename__ = "savings_cards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    # The owner the card was computed for, with that owner's rates. Cards never outlive an ownership change.
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    scope_version_id: Mapped[str] = mapped_column(ForeignKey("scope_versions.id"), nullable=False)
    # Stable identity of the segment: labor category, PSC and NAICS. Dismissals and oversight carry across by it.
    segment_key: Mapped[str] = mapped_column(String(255), nullable=False)
    # JSON of every input: requirement keys, hours and status, rates with provenance, evidence summaries.
    inputs_json: Mapped[str] = mapped_column(Text, nullable=False)
    # JSON list of market_evidence ids the card read.
    evidence_ids_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    # JSON of the thresholds in force when computed, printed on the card.
    thresholds_json: Mapped[str] = mapped_column(Text, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    billing_period: Mapped[str] = mapped_column(String(32), nullable=False)
    keep_cost_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    suggested_cut_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Owner-entered; None makes the card provisional.
    oversight_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    modeled_savings_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    modeled_savings_basis_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # potential_savings | specialist_market | needs_rates | not_viable
    tier: Mapped[str] = mapped_column(String(32), nullable=False)
    # JSON list of plain-language reasons for the tier, e.g. which threshold failed.
    reasons_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    # suggested | dismissed | split | stale
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="suggested")
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
