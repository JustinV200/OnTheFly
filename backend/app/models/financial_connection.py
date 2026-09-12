"""Persists sandbox bank ownership and resumable connection sessions."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FinancialConnection(Base):
    """One sandbox bank connection per demo company."""

    __tablename__ = "financial_connections"
    owner_account_id: Mapped[str] = mapped_column(
        ForeignKey("accounts.id"), primary_key=True
    )
    customer_id: Mapped[str] = mapped_column(String(128), unique=True)
    session_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    bank_account_id: Mapped[str | None] = mapped_column(
        String(128), unique=True, nullable=True
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
