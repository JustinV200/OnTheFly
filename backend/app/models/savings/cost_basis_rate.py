"""Stores an account's private cost basis rates: its current contract rates as a buyer, or its internal costs.
Rates never appear in a public projection or in any other account's response (roadmap 12, step 7).
"""

from datetime import date, datetime, timezone
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CostBasisRate(Base):
    """One hourly rate for one labor category, owned by one account."""

    __tablename__ = "cost_basis_rates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    # Scopes the rate to one task (a buyer's contract rates on that task); None applies to every task it owns.
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), nullable=True, index=True)
    # internal_cost | current_contract_rate
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    labor_category: Mapped[str] = mapped_column(String(120), nullable=False)
    rate_minor_per_hour: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    # owner-entered | fixture
    provenance: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
