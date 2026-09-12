"""Classifies whether a grouped expense is eligible and publishable.
Hard exclusions stay hard exclusions regardless of any later UI action.
"""

from pydantic import BaseModel

import re

# Known payroll-provider vendor-name signals.  These supplement the generic
# "payroll" keyword to catch transactions from specific processors whose
# names don't include the word.  Extend this list rather than adding more
# inline conditionals.
PAYROLL_VENDOR_SIGNALS: tuple[str, ...] = (
    "payroll",
    "gusto",
    "adp",
    "rippling",
    "paychex",
    "bamboohr",
    "justworks",
)


class EligibilityResult(BaseModel):
    """States whether a grouped expense may appear in the publish flow."""

    eligible: bool
    reason: str
    publishable: bool



def classify_eligibility(vendor: str, category: str | None, direction: str) -> EligibilityResult:
    """Apply deterministic hard exclusions for payroll, taxes, and transfers.

    Credits are excluded only when they are also identified as transfers in the
    vendor/category text; ordinary vendor refunds/credits reduce net spend and
    should reconcile against the expense group, not make it ineligible.
    """

    haystack = f"{vendor} {category or ''}".casefold()
    # Exclude transactions explicitly identified as transfers by description or category.
    # Ordinary vendor refunds and credits (no "transfer" keyword) are not excluded —
    # they reduce net spend and should reconcile against the expense group.
    if "transfer" in haystack:
        return EligibilityResult(eligible=False, reason="transfer", publishable=False)
    if any(signal in haystack for signal in PAYROLL_VENDOR_SIGNALS):
        return EligibilityResult(eligible=False, reason="payroll", publishable=False)
    # Use a whole-word match to avoid false-positives on vendor names that contain
    # "tax" as a substring (e.g. "Syntaxco", "Exacta Supplies").
    if re.search(r"\btax\b", haystack):
        return EligibilityResult(eligible=False, reason="tax", publishable=False)
    return EligibilityResult(eligible=True, reason="eligible", publishable=True)
