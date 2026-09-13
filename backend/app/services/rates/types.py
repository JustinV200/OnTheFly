"""Declares cost basis rate kinds, provenance and the validated input for owner-entered rates."""

from datetime import date
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class RateKind(StrEnum):
    """Which cost a rate describes."""

    # A task owner that won the task by bidding: what the work costs it in-house, fully loaded.
    internal_cost = "internal_cost"
    # A buyer: what its current contract bills for the labor category.
    current_contract_rate = "current_contract_rate"


class RateProvenance(StrEnum):
    """Where a rate came from. Both are private; fixture rates are demo data and labeled so."""

    owner_entered = "owner-entered"
    fixture = "fixture"


class RateInput(BaseModel):
    """One rate an owner enters for its own account."""

    task_id: str | None = None
    kind: RateKind
    labor_category: str = Field(min_length=1, max_length=120)
    rate_minor_per_hour: int = Field(gt=0)
    currency: str = "USD"
    effective_date: date

    @field_validator("labor_category")
    @classmethod
    def _labor_category_trimmed(cls, value: str) -> str:
        # Rates match requirement rows by exact labor category, so surrounding spaces would silently miss.
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("A rate needs a labor category")
        return trimmed

    @field_validator("currency")
    @classmethod
    def _currency_code(cls, value: str) -> str:
        code = value.strip().upper()
        if len(code) != 3 or not code.isascii() or not code.isalpha():
            raise ValueError("currency must be a three-letter code such as USD")
        return code
