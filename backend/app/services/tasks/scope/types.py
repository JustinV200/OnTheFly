"""Declares the owner-confirmed scope draft a task version is written from, for every task origin.
Validated at the API boundary; category fields are checked again by the category's template before storing.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.services.scope.requirements import ConstraintInput, RequirementInput

# The regular cadences a task can be priced in. Must stay in sync with MONTHLY_FACTORS in app/core/cadence.py.
TaskBillingPeriod = Literal["weekly", "biweekly", "monthly", "bimonthly", "quarterly", "annual", "yearly"]


class TaskScopeDraft(BaseModel):
    """What the owner confirmed about the work: title, where, price, requirement rows and constraints."""

    title: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=64)
    service_area: str | None = Field(default=None, max_length=255)
    # A rebid's confirmed current price, a new task's budget, or ignored for a piece (whose price is its cut).
    # None on a new task means no budget, never zero.
    price_minor: int | None = Field(default=None, gt=0)
    currency: str = "USD"
    billing_period: TaskBillingPeriod
    challenge_deadline: datetime | None = None
    # Validated by the category's template (services/scope/templates); a free-form object until then, so the
    # template, not this schema, owns each category's field list.
    category_fields: dict[str, object] | None = None
    requirements: list[RequirementInput] = Field(min_length=1)
    constraints: list[ConstraintInput] = Field(default_factory=list)
    # Rebid only, and hidden unless the owner opts in at publish (CLAUDE.md, incumbent vendor name).
    incumbent_vendor_name: str | None = Field(default=None, max_length=255)

    @field_validator("category")
    @classmethod
    def _category_key(cls, value: str) -> str:
        # Category keys are lowercase with underscores everywhere else (filters, templates, labels).
        return value.strip().casefold().replace(" ", "_")

    @field_validator("currency")
    @classmethod
    def _currency_code(cls, value: str) -> str:
        code = value.strip().upper()
        if len(code) != 3 or not code.isascii() or not code.isalpha():
            raise ValueError("currency must be a three-letter code such as USD")
        return code


class TaskPublishChoices(BaseModel):
    """The poster's disclosure choices for a new task or a piece."""

    bidding_mode: Literal["sealed", "open"] = "sealed"
    # Off by default for new tasks and pieces (roadmap open question 5): the budget or cut stays private.
    show_price: bool = False
