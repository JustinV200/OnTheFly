"""Normalizes challenge prices and measures scope completeness against a scope version.
Scope gaps are surfaced before price so under-scoped bids do not rank first.
"""

import json
import re

from pydantic import BaseModel

from app.core.cadence import to_monthly
from app.core.money import Money
from app.models.challenge import Challenge
from app.models.listing import ScopeVersion


FREQUENCY_RE = re.compile(r"(\d+)x\s+weekly", re.IGNORECASE)


class NormalizedOffer(BaseModel):
    """Represents a challenge normalized onto a monthly price basis."""

    monthly_price: Money

    model_config = {"arbitrary_types_allowed": True}


class ScopeCompletenessResult(BaseModel):
    """Summarizes missing, added, and unstated scope elements."""

    score: float
    missing_items: list[str]
    added_items: list[str]
    unstated_items: list[str]
    breakdown: dict[str, float]



def normalize_to_monthly(challenge: Challenge) -> NormalizedOffer:
    """Normalize one challenge's billing frequency to a monthly Money amount."""

    base = Money(amount=challenge.price_minor, currency=challenge.price_currency)
    return NormalizedOffer(monthly_price=to_monthly(base, challenge.billing_frequency))



def is_scope_complete(challenge: Challenge, scope: ScopeVersion) -> ScopeCompletenessResult:
    """Compare a challenge payload with the requested scope and score completeness."""

    included = json.loads(challenge.scope_included)
    excluded = json.loads(challenge.scope_excluded)
    extras = json.loads(challenge.scope_extras)
    missing_items: list[str] = []
    added_items = list(extras)
    unstated_items: list[str] = []
    breakdown: dict[str, float] = {}

    expected_tasks = json.loads(scope.required_tasks) if scope.required_tasks else []
    # Owners and challengers type tasks freely, so "Vacuum " and "vacuum" are the same task; a
    # capitalization difference must not turn an honest full-scope offer into a scope gap.
    included_tasks = {item.strip().casefold() for item in included}
    missing_tasks = [task for task in expected_tasks if task.strip().casefold() not in included_tasks]
    if missing_tasks:
        missing_items.extend([f"task:{task}" for task in missing_tasks])
        breakdown["required_tasks"] = 0.0
    elif expected_tasks:
        breakdown["required_tasks"] = 1.0

    frequency_status = _compare_visit_frequency(included, scope.visit_frequency)
    missing_items.extend(frequency_status["missing"])
    unstated_items.extend(frequency_status["unstated"])
    if scope.visit_frequency:
        breakdown["visit_frequency"] = frequency_status["score"]

    supplies_status = _compare_boolean_field(
        expected=scope.supplies_included,
        actual=challenge.supplies_included,
        label="supplies_included",
    )
    taxes_status = _compare_boolean_field(
        expected=scope.taxes_included,
        actual=challenge.taxes_included,
        label="taxes_included",
    )
    missing_items.extend(supplies_status["missing"] + taxes_status["missing"])
    unstated_items.extend(supplies_status["unstated"] + taxes_status["unstated"])
    breakdown.update(supplies_status["breakdown"])
    breakdown.update(taxes_status["breakdown"])

    if scope.equipment_included:
        if any("equipment" in item.casefold() for item in excluded):
            missing_items.append("equipment_included")
            breakdown["equipment_included"] = 0.0
        elif any("equipment" in item.casefold() for item in included + extras):
            breakdown["equipment_included"] = 1.0
        else:
            unstated_items.append("equipment_included")
            breakdown["equipment_included"] = 0.5

    scored = list(breakdown.values()) or [1.0]
    score = round(sum(scored) / len(scored), 3)
    return ScopeCompletenessResult(
        score=score,
        missing_items=missing_items,
        added_items=added_items,
        unstated_items=unstated_items,
        breakdown=breakdown,
    )


def _compare_visit_frequency(included: list[str], expected: str | None) -> dict[str, list[str] | float]:
    if not expected:
        return {"missing": [], "unstated": [], "score": 1.0}

    expected_match = FREQUENCY_RE.search(expected)
    challenge_match = next((FREQUENCY_RE.search(item) for item in included if FREQUENCY_RE.search(item)), None)
    if challenge_match is None:
        return {"missing": [], "unstated": [f"visit_frequency:{expected}"], "score": 0.5}
    if expected_match and challenge_match.group(1) != expected_match.group(1):
        return {"missing": [f"visit_frequency:{expected}"], "unstated": [], "score": 0.0}
    return {"missing": [], "unstated": [], "score": 1.0}


def _compare_boolean_field(expected: bool | None, actual: bool | None, label: str) -> dict[str, object]:
    if expected is None:
        return {"missing": [], "unstated": [], "breakdown": {}}
    if actual is None:
        return {"missing": [], "unstated": [label], "breakdown": {label: 0.5}}
    if actual != expected:
        return {"missing": [label], "unstated": [], "breakdown": {label: 0.0}}
    return {"missing": [], "unstated": [], "breakdown": {label: 1.0}}
