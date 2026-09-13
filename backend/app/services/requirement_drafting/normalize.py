"""Turns a model's rows into requirement inputs the owner can review, deciding in code what's kept. A malformed tag or
implausible hour count becomes unanswered rather than a guess; a blank or repeated row is dropped and counted.
Every kept row is a draft: source llm-draft, tags and hours unconfirmed until the owner confirms them.
"""

import re

from pydantic import BaseModel

from app.services.requirement_drafting.types import ModelDraft
from app.services.scope.requirements import RequirementInput

MAX_DRAFTED_ROWS = 20
MAX_OPEN_QUESTIONS = 5
MAX_TEXT_LENGTH = 2000
MAX_LABOR_CATEGORY_LENGTH = 120
MAX_QUESTION_LENGTH = 300
# Hours are per billing period. Above this (about eleven people working every hour of a year) the figure is noise.
MAX_HOURS = 100_000
_PSC_PATTERN = re.compile(r"^[A-Z0-9]{4}$")
_NAICS_PATTERN = re.compile(r"^\d{6}$")


class NormalizedDraft(BaseModel):
    """The rows and questions code accepted, and how many model rows it refused."""

    requirements: list[RequirementInput]
    open_questions: list[str]
    dropped_count: int


def normalize_draft(draft: ModelDraft, existing_requirements: list[str]) -> NormalizedDraft:
    """Return the usable rows, never more than MAX_DRAFTED_ROWS, skipping any that repeat an existing requirement."""

    seen = {_comparable(text) for text in existing_requirements}
    rows: list[RequirementInput] = []
    dropped = 0
    for item in draft.requirements:
        text = " ".join(item.text.split())
        if not text or len(text) > MAX_TEXT_LENGTH or _comparable(text) in seen or len(rows) >= MAX_DRAFTED_ROWS:
            dropped += 1
            continue
        seen.add(_comparable(text))
        hours = item.hours_estimate if item.hours_estimate is not None and 0 < item.hours_estimate <= MAX_HOURS else None
        rows.append(
            RequirementInput(
                text=text,
                priority="should" if item.priority == "should" else "must",
                labor_category=_labor_category(item.labor_category),
                psc=_matching(item.psc, _PSC_PATTERN, upper=True),
                naics=_matching(item.naics, _NAICS_PATTERN, upper=False),
                tags_status="draft",
                hours_estimate=hours,
                hours_status="draft" if hours is not None else "unanswered",
                source="llm-draft",
            )
        )
    questions = [" ".join(question.split()) for question in draft.open_questions]
    kept_questions = [question for question in questions if question and len(question) <= MAX_QUESTION_LENGTH][:MAX_OPEN_QUESTIONS]
    return NormalizedDraft(requirements=rows, open_questions=kept_questions, dropped_count=dropped)


def _comparable(text: str) -> str:
    return " ".join(text.split()).casefold()


def _labor_category(value: str | None) -> str | None:
    trimmed = " ".join(value.split()) if value else ""
    return trimmed if trimmed and len(trimmed) <= MAX_LABOR_CATEGORY_LENGTH else None


def _matching(value: str | None, pattern: re.Pattern[str], upper: bool) -> str | None:
    if value is None:
        return None
    trimmed = value.strip().upper() if upper else value.strip()
    return trimmed if pattern.fullmatch(trimmed) else None
