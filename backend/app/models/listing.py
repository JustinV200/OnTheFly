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
    """Stores one versioned scope draft for a task: a rebid of a private expense, new work, or a split piece."""

    __tablename__ = "scope_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Set for a rebid of observed spend; None for a new task or a piece, which have no expense behind them.
    expense_id: Mapped[str | None] = mapped_column(ForeignKey("service_expenses.id"), nullable=True, index=True)
    # The task this version scopes. Versions are numbered per task (per expense for rows from before tasks).
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), nullable=True, index=True)
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
    # A category template's own fields as a JSON object (roadmap 12, step 2), validated at the API boundary by
    # services/scope/templates. Cleaning keeps using the columns above; None means the template has no fields.
    category_fields: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    # None for a new task or a piece. SQLite and Postgres both allow many NULLs under the unique constraint.
    expense_id: Mapped[str | None] = mapped_column(ForeignKey("service_expenses.id"), nullable=True)
    # The task this listing is the public projection of. Every listing resolves to exactly one task.
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), nullable=True, index=True)
    scope_version_id: Mapped[str] = mapped_column(ForeignKey("scope_versions.id"), nullable=False)
    # The POSTER: the account that published this listing and is the client for its task. It never changes, and
    # is not the task owner, which moves to the winning bidder on acceptance (see Task.owner_account_id).
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    scope_summary: Mapped[str] = mapped_column(Text, nullable=False)
    # None when the poster hides the price (the default for new tasks and pieces): the number is never stored
    # in the public record at all, so no serializer can leak it.
    price_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
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
    # Roadmap 12 additions, all snapshotted from the task's own scope version, never from a parent task.
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # JSON arrays of the public requirement and constraint shapes; None on listings from before requirements.
    requirements_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    constraints_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The category template's public label/value pairs, rendered when the owner confirmed scope.
    scope_fields_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # True on a piece split from an accepted task, so bidders know payment depends on the account above.
    is_subcontract: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # The poster's price display choice. Rebid listings keep showing their price; new tasks and pieces default off.
    show_price: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
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
