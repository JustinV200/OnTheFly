"""Stores imported financial transactions in their original, private form.
This model preserves source fidelity and never implies publishability by itself.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Transaction(Base):
    """Represents one imported transaction linked to an owner account."""

    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_account_id",
            "provider_transaction_id",
            name="uq_transaction_provider_record",
        ),
        Index("ix_transactions_owner_account_id", "owner_account_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_account_id: Mapped[str] = mapped_column(String(128), nullable=False)
    provider_transaction_id: Mapped[str] = mapped_column(String(128), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    raw_description: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    direction: Mapped[str] = mapped_column(String(16), nullable=False)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    counterparty: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_payload: Mapped[str] = mapped_column(Text, nullable=False)
    is_excluded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    excluded_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
