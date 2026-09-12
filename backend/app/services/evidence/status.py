"""Rolls individual evidence checks into one owner-facing label that names the sources behind it.
There is deliberately no "verified" outcome; the strongest label is scoped to the sources that ran.
"""

from typing import Literal

from pydantic import BaseModel

from app.services.evidence.check import CheckResult

# Statuses meaning the source was actually consulted. not_checked and unavailable did not run,
# and are listed as such rather than dropped, so completed checks don't look comprehensive.
RAN_STATUSES = frozenset({"matched", "no_match_found", "uncertain"})


class EvidenceRollup(BaseModel):
    """A rollup label plus the sources it does and does not cover."""

    label: Literal["needs review", "information missing", "checks complete for selected sources"]
    sources_checked: list[str]
    sources_not_run: list[str]


def rollup_evidence(checks: list[CheckResult]) -> EvidenceRollup:
    """Return needs review if any check is uncertain, information missing if any didn't run."""

    sources_checked = [check.source for check in checks if check.status in RAN_STATUSES]
    sources_not_run = [check.source for check in checks if check.status not in RAN_STATUSES]
    if any(check.status == "uncertain" for check in checks):
        label = "needs review"
    elif sources_not_run:
        label = "information missing"
    else:
        label = "checks complete for selected sources"
    return EvidenceRollup(label=label, sources_checked=sources_checked, sources_not_run=sources_not_run)
