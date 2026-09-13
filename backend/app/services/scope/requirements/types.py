"""Declares the validated shapes requirement rows and constraints take at the service boundary.
The API validates into these, and services write rows only from them, so a raw request dict never reaches the database.
"""

from typing import Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator

RequirementPriority = Literal["must", "should"]
TagsStatus = Literal["draft", "confirmed"]
HoursStatus = Literal["draft", "confirmed", "unanswered"]
RequirementSource = Literal["owner", "llm-draft", "flowed-down"]
ConstraintKind = Literal["clearance", "location", "insurance", "set_aside"]


class RequirementInput(BaseModel):
    """One requirement as the owner confirmed it. key is None for a new requirement; code assigns one."""

    key: str | None = Field(default=None, max_length=64)
    text: str = Field(min_length=1, max_length=2000)
    priority: RequirementPriority = "must"
    labor_category: str | None = Field(default=None, max_length=120)
    psc: str | None = Field(default=None, max_length=8)
    naics: str | None = Field(default=None, max_length=8)
    tags_status: TagsStatus = "draft"
    # Hours per the task's billing period. None is an explicitly unanswered estimate, never zero.
    hours_estimate: int | None = Field(default=None, gt=0)
    hours_status: HoursStatus = "unanswered"
    source: RequirementSource = "owner"

    @field_validator("text", "labor_category", "psc", "naics")
    @classmethod
    def _trimmed(cls, value: str | None) -> str | None:
        # Labor categories group Ways to save segments by exact value, so stray spaces must not split a segment.
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("hours_status")
    @classmethod
    def _hours_status_matches(cls, value: str, info: ValidationInfo) -> str:
        # An estimate with no hours can't be draft or confirmed; hours with no status read as a draft.
        hours = info.data.get("hours_estimate")
        if hours is None:
            return "unanswered"
        return "draft" if value == "unanswered" else value


class ConstraintInput(BaseModel):
    """One constraint that bidders must meet and that flows down into pieces by default."""

    kind: ConstraintKind
    value: str = Field(min_length=1, max_length=255)
    # Set by the splitting service only; the API schema for owners has no such field.
    inherited_from_task_id: str | None = None

    @field_validator("value")
    @classmethod
    def _value_trimmed(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("A constraint needs a value")
        return trimmed
