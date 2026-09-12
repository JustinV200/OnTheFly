"""Deterministically matches a challenger to an external business record using identifiers.
It never uses model output, and an adverse record's contents are returned only on a confirmed match.
"""

from datetime import datetime, timezone
import re
from typing import Literal

from pydantic import BaseModel

from app.services.evidence.check import CheckResult

SOURCE_NAME = "identity match"

# Entity suffixes carry no identity, so they're dropped before names are compared. This is
# also why name agreement alone never reaches confirmed: "ABC Cleaning LLC" and
# "ABC Cleaning Inc" can be unrelated companies two towns apart (roadmap 07, step 2).
ENTITY_SUFFIXES = frozenset({"co", "company", "corp", "corporation", "inc", "incorporated", "llc", "ltd"})


class ChallengerIdentifiers(BaseModel):
    """What the platform holds about a challenger that can be matched against a record."""

    legal_name: str
    location: str | None
    registration_number: str | None


class ExternalBusinessRecord(BaseModel):
    """One record from an external source that might describe the challenger."""

    source: str
    legal_name: str
    location: str | None
    registration_number: str | None
    # Each adverse-record source has its own shape; the matcher passes it through unread.
    adverse_record: dict[str, object] | None = None


def match_identity(
    challenger: ChallengerIdentifiers,
    record: ExternalBusinessRecord | None,
) -> CheckResult:
    """Tier the match as confirmed, probable, uncertain, or no match; not_checked without a record."""

    checked_at = datetime.now(timezone.utc)
    if record is None:
        return CheckResult(
            source=SOURCE_NAME,
            checked_at=checked_at,
            status="not_checked",
            match_confidence=None,
            result=None,
            limitations="No external business record was available to match this challenger against.",
        )

    challenger_number = _normalize_identifier(challenger.registration_number)
    record_number = _normalize_identifier(record.registration_number)
    if challenger_number and record_number:
        if challenger_number != record_number:
            # Different registration numbers are different entities, however alike the names.
            return _no_match(checked_at, record.source)
        result: dict[str, object] = {
            "source": record.source,
            "legal_name": record.legal_name,
            "registration_number": record.registration_number,
        }
        if record.adverse_record is not None:
            result["adverse_record"] = record.adverse_record
        return CheckResult(
            source=SOURCE_NAME,
            checked_at=checked_at,
            status="matched",
            match_confidence="confirmed",
            result=result,
            limitations=f"Matched on registration number against {record.source} only.",
        )

    challenger_tokens = _name_tokens(challenger.legal_name)
    record_tokens = _name_tokens(record.legal_name)
    if challenger_tokens and challenger_tokens == record_tokens:
        challenger_location = _normalize_text(challenger.location)
        same_location = bool(challenger_location) and challenger_location == _normalize_text(record.location)
        return _needs_review(checked_at, record.source, "probable" if same_location else "uncertain")
    if challenger_tokens and record_tokens and (
        challenger_tokens <= record_tokens or record_tokens <= challenger_tokens
    ):
        return _needs_review(checked_at, record.source, "uncertain")
    return _no_match(checked_at, record.source)


def _needs_review(
    checked_at: datetime,
    record_source: str,
    confidence: Literal["probable", "uncertain"],
) -> CheckResult:
    # Below confirmed, report only that a possible match exists: never the record's contents,
    # which would attach someone else's record to this challenger.
    return CheckResult(
        source=SOURCE_NAME,
        checked_at=checked_at,
        status="uncertain",
        match_confidence=confidence,
        result={"summary": "A possible match exists and needs review.", "source": record_source},
        limitations="No identifier-level match; record contents are withheld until one is confirmed.",
    )


def _no_match(checked_at: datetime, record_source: str) -> CheckResult:
    return CheckResult(
        source=SOURCE_NAME,
        checked_at=checked_at,
        status="no_match_found",
        match_confidence="no_match",
        result=None,
        limitations=f"Compared against one record from {record_source}; other sources were not searched.",
    )


def _normalize_identifier(value: str | None) -> str:
    return re.sub(r"[^0-9a-z]", "", (value or "").casefold())


def _normalize_text(value: str | None) -> str:
    return " ".join(re.findall(r"[0-9a-z]+", (value or "").casefold()))


def _name_tokens(name: str) -> frozenset[str]:
    return frozenset(token for token in _normalize_text(name).split() if token not in ENTITY_SUFFIXES)
