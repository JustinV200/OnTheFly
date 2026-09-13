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
    status: str
    direction: str
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
    first_seen: datetime
    last_seen: datetime
    visibility: str
    is_eligible: bool
    eligibility_reason: str
    is_publishable: bool
    # The owner's listing for this expense, if one was ever drafted. It survives unpublishing
    # so the owner can still reach challenges received while it was public.
    listing_id: str | None
    # The owner's REBID task for this expense, if one was created, so Spend can open the task page directly, and its
    # lifecycle state, so an accepted task isn't offered publish or unpublish actions.
    task_id: str | None
    task_state: str | None
    # Distinct source_type values of the transactions behind this row (production | sandbox |
    # imported | fixture). A list, because one vendor's history can span sources.
    provenance: list[str]


class ExpenseDetailResponse(ExpenseResponse):
    """Represents an expense row plus its supporting private transactions."""

    supporting_transactions: list[TransactionResponse]


class ExpenseListResponse(BaseModel):
    """Wraps the dashboard expense list and an optional empty-state message."""

    expenses: list[ExpenseResponse]
    message: str | None = None


class ExpenseUpdateRequest(BaseModel):
    """Captures owner corrections for vendor/category and explicit publishability.

    Omitted fields are left unchanged. A null vendor or category clears that correction;
    is_publishable false marks the expense not publishable and true clears the mark.
    """

    owner_corrected_vendor: str | None = None
    owner_corrected_category: str | None = None
    is_publishable: bool | None = None
