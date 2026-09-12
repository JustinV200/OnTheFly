"""Stores the owner's grouped recurring-spend view for the dashboard.
This model stays private until a later phase constructs an explicit public projection.
"""

from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.visibility import ListingVisibility
from app.db.base import Base


class ServiceExpense(Base):
    """Represents one owner-visible grouped expense baseline."""

    __tablename__ = "service_expenses"
    __table_args__ = (
        UniqueConstraint(
            "owner_account_id",
            "normalized_vendor",
            name="uq_service_expense_owner_vendor",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    normalized_vendor: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    cadence: Mapped[str] = mapped_column(String(32), nullable=False)
    recurrence_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    amount_minor_per_period: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    annualized_amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_count: Mapped[int] = mapped_column(Integer, nullable=False)
    is_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False)
    eligibility_reason: Mapped[str] = mapped_column(String(255), nullable=False)
    is_publishable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    visibility: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ListingVisibility.private.value,
    )
    owner_corrected_vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_corrected_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
