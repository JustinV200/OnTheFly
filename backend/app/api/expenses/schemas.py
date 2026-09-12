"""Pydantic schemas for the private expenses dashboard endpoints.
They shape only owner-visible data and never act as public listing projections.
"""

from datetime import datetime

from pydantic import BaseModel


class TransactionResponse(BaseModel):
    """Represents a supporting private transaction in an expense detail view."""

    id: str
    raw_description: str
    normalized_vendor: str | None
    amount_minor: int
    currency: str
    posted_at: datetime
    source_type: str
    is_excluded: bool
    excluded_reason: str | None


class ExpenseResponse(BaseModel):
    """Represents one service expense row in the dashboard list."""

    id: str
    vendor: str
    category: str | None
    cadence: str
    recurrence_confidence: float
    amount_minor_per_period: int
    currency: str
    annualized_amount_minor: int
    period_count: int
    visibility: str
    is_eligible: bool
    eligibility_reason: str
    is_publishable: bool


class ExpenseDetailResponse(ExpenseResponse):
    """Represents an expense row plus its supporting private transactions."""

    supporting_transactions: list[TransactionResponse]


class ExpenseListResponse(BaseModel):
    """Wraps the dashboard expense list and an optional empty-state message."""

    expenses: list[ExpenseResponse]
    message: str | None = None


class ImportRequest(BaseModel):
    """Captures the provider account ID to use for a manual import trigger."""

    provider_account_id: str


class ImportResultResponse(BaseModel):
    """Summarizes one import run's new, duplicate, excluded, and failed counts."""

    new: int
    duplicate: int
    excluded: int
    failed: int


class ExpenseUpdateRequest(BaseModel):
    """Captures owner corrections for vendor/category and explicit publishability."""

    owner_corrected_vendor: str | None = None
    owner_corrected_category: str | None = None
    is_publishable: bool | None = None
