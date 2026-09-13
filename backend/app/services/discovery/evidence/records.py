"""The evidence stored on a provider candidate: each award or web page a detail came from, kept separately attributable.
Award facts are tied to a supplier by UEI; web pages only by a name search, and each record says which.
"""

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, TypeAdapter


class AwardEvidence(BaseModel):
    """One USAspending prime contract award won by the candidate's UEI. The amount is integer cents."""

    kind: Literal["usaspending_award"] = "usaspending_award"
    # The PIID as displayed; generated_award_id is USAspending's unique key, since a PIID can repeat.
    award_id: str
    generated_award_id: str | None
    url: str | None
    recipient_uei: str
    awarding_agency: str | None
    amount_minor: int | None
    currency: Literal["USD"] = "USD"
    start_date: date | None
    naics_code: str | None
    psc_code: str | None
    place_of_performance_state: str | None
    retrieved_at: datetime


class WebEvidence(BaseModel):
    """One web page returned when searching for the candidate's name."""

    kind: Literal["web_page"] = "web_page"
    # The search provider that returned the page, e.g. "tavily".
    source: str
    url: str
    title: str | None
    snippet: str | None
    # A name search can return a different business with a similar name; nothing here verifies identity.
    match_basis: Literal["name_search"] = "name_search"
    retrieved_at: datetime


CandidateEvidence = Annotated[AwardEvidence | WebEvidence, Field(discriminator="kind")]

_EVIDENCE_LIST = TypeAdapter(list[CandidateEvidence])


def parse_evidence_json(stored: str) -> list[AwardEvidence | WebEvidence]:
    """Validate a candidate's stored evidence column; raises on a malformed row rather than showing partial evidence."""

    return _EVIDENCE_LIST.validate_json(stored)


def evidence_json(evidence: list[AwardEvidence | WebEvidence]) -> str:
    """Serialize evidence for the candidate's evidence column."""

    return _EVIDENCE_LIST.dump_json(evidence).decode("utf-8")
