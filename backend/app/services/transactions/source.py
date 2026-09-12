"""Declares the normalized transaction schema and source interface.
Concrete providers implement this protocol behind the import pipeline.
"""

from datetime import date, datetime
from typing import Protocol

from pydantic import BaseModel, Field


class NormalizedTransaction(BaseModel):
    """Represents one source transaction in the app's normalized shape."""

    provider: str
    provider_account_id: str
    provider_transaction_id: str
    source_type: str
    raw_description: str
    normalized_vendor: str | None = None
    amount_minor: int
    currency: str = Field(default="USD", min_length=3, max_length=8)
    direction: str
    posted_at: datetime
    status: str
    category: str | None = None
    memo: str | None = None
    counterparty: str | None = None
    raw_payload: str


class TransactionSource(Protocol):
    """Lists transactions for one provider account over a date window."""

    def list_transactions(
        self,
        provider_account_id: str,
        since: date,
        until: date,
    ) -> list[NormalizedTransaction]:
        """Return normalized transactions for the requested provider account."""
