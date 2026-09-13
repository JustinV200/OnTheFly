"""Declares what requirement drafting takes in, what a model hands back, and what the owner receives.
The model's shape is kept separate from the result: code validates every model row before it becomes a RequirementInput.
"""

from typing import Literal

from pydantic import BaseModel, Field

from app.services.scope.requirements import RequirementInput
from app.services.tasks.scope.types import TaskBillingPeriod

MAX_DESCRIPTION_LENGTH = 4000
MAX_EXISTING_REQUIREMENTS = 50


class DraftRequest(BaseModel):
    """The owner's own description of the work, plus the task context the draft must fit. No transaction data or
    vendor names: the model drafts from owner-provided detail only (CLAUDE.md, AI boundaries)."""

    description: str = Field(min_length=10, max_length=MAX_DESCRIPTION_LENGTH)
    category: str = Field(min_length=1, max_length=64)
    billing_period: TaskBillingPeriod
    service_area: str | None = Field(default=None, max_length=255)
    # Rows already on the form or task, so the draft doesn't repeat them.
    existing_requirements: list[str] = Field(default_factory=list, max_length=MAX_EXISTING_REQUIREMENTS)
    # "piece" when drafting in the split drawer: the rows describe work split off another task.
    purpose: Literal["task", "piece"] = "task"


class ModelRequirement(BaseModel):
    """One row exactly as a model returned it; nothing here is trusted until normalize.py checks it."""

    text: str
    priority: str
    labor_category: str | None
    psc: str | None
    naics: str | None
    hours_estimate: int | None


class ModelDraft(BaseModel):
    """A model's whole answer: rows and the questions only the owner can answer."""

    requirements: list[ModelRequirement]
    open_questions: list[str]


DraftStatus = Literal["drafted", "not_run", "failed"]


class RequirementDraftResult(BaseModel):
    """What the owner sees. Rows are drafts (source llm-draft, tags and hours unconfirmed) until the owner saves them."""

    status: DraftStatus
    # Why drafting didn't run or failed, in words safe to show; None when drafted.
    detail: str | None
    requirements: list[RequirementInput]
    open_questions: list[str]
    # Rows the model returned that code refused (blank, duplicate, or over the row limit).
    dropped_count: int
    model: str | None
    prompt_version: str | None
