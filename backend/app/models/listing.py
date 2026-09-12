"""Stores scope versions and the persisted public listing projection.
The public record is additive and never filtered down from private expense data.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.visibility import ListingVisibility
from app.db.base import Base


class ScopeVersion(Base):
    """Stores one versioned scope draft attached to a private expense."""

    __tablename__ = "scope_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id: Mapped[str] = mapped_column(ForeignKey("service_expenses.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    service_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location_approximate: Mapped[str | None] = mapped_column(String(255), nullable=True)
    square_footage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    visit_frequency: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bathroom_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    required_tasks: Mapped[str | None] = mapped_column(Text, nullable=True)
    supplies_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    equipment_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    taxes_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    insurance_required: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_date: Mapped[str | None] = mapped_column(String(64), nullable=True)
    minimum_term: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cancellation_terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_price_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_price_currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    billing_cadence: Mapped[str | None] = mapped_column(String(32), nullable=True)
    challenge_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    incumbent_vendor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class PublicListingRecord(Base):
    """Stores the exact additive projection that can be served publicly."""

    __tablename__ = "public_listings"
    __table_args__ = (UniqueConstraint("expense_id", name="uq_public_listing_expense_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id: Mapped[str] = mapped_column(ForeignKey("service_expenses.id"), nullable=False)
    scope_version_id: Mapped[str] = mapped_column(ForeignKey("scope_versions.id"), nullable=False)
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    scope_summary: Mapped[str] = mapped_column(Text, nullable=False)
    price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    price_currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    billing_cadence: Mapped[str] = mapped_column(String(32), nullable=False)
    service_area_approximate: Mapped[str] = mapped_column(String(255), nullable=False)
    bidding_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="sealed")
    challenge_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    show_incumbent_vendor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    incumbent_vendor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    show_exact_address: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # The scored scope requirements, snapshotted like the fields above so a challenger can match
    # them exactly. Tasks are a JSON array string, as on ScopeVersion; None means none recorded.
    required_tasks: Mapped[str | None] = mapped_column(Text, nullable=True)
    visit_frequency: Mapped[str | None] = mapped_column(String(64), nullable=True)
    supplies_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    equipment_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    taxes_included: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    visibility: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ListingVisibility.private.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
