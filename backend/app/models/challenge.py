"""Stores current challenges and their retained revision snapshots.
Challenge publicity is determined by the mode recorded at submission time.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Challenge(Base):
    """Represents the current active version of one challenger's offer."""

    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("public_listings.id"), nullable=False, index=True)
    scope_version_id: Mapped[str] = mapped_column(ForeignKey("scope_versions.id"), nullable=False)
    challenger_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    bidding_mode_at_submission: Mapped[str] = mapped_column(String(16), nullable=False)
    price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    price_currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    billing_frequency: Mapped[str] = mapped_column(String(32), nullable=False)
    scope_included: Mapped[str] = mapped_column(Text, nullable=False)
    scope_excluded: Mapped[str] = mapped_column(Text, nullable=False)
    scope_extras: Mapped[str] = mapped_column(Text, nullable=False)
    setup_fee_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    taxes_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    supplies_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    minimum_term: Mapped[str | None] = mapped_column(String(255), nullable=True)
    other_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_to_owner: Mapped[str | None] = mapped_column(Text, nullable=True)
    availability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    offer_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    site_visit_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    provenance: Mapped[str] = mapped_column(String(64), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    revised_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ChallengeRevision(Base):
    """Stores immutable snapshots of prior challenge versions."""

    __tablename__ = "challenge_revisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"), nullable=False, index=True)
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    bidding_mode_at_revision: Mapped[str] = mapped_column(String(16), nullable=False)
    price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    price_currency: Mapped[str] = mapped_column(String(8), nullable=False)
    billing_frequency: Mapped[str] = mapped_column(String(32), nullable=False)
    scope_included: Mapped[str] = mapped_column(Text, nullable=False)
    scope_excluded: Mapped[str] = mapped_column(Text, nullable=False)
    scope_extras: Mapped[str] = mapped_column(Text, nullable=False)
    setup_fee_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    taxes_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    supplies_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    minimum_term: Mapped[str | None] = mapped_column(String(255), nullable=True)
    other_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_to_owner: Mapped[str | None] = mapped_column(Text, nullable=True)
    availability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    offer_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    site_visit_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    provenance: Mapped[str] = mapped_column(String(64), nullable=False)
    revised_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
