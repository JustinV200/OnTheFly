"""Classifies whether a grouped expense is eligible and publishable.
Hard exclusions stay hard exclusions regardless of any later UI action.
"""

from pydantic import BaseModel


class EligibilityResult(BaseModel):
    """States whether a grouped expense may appear in the publish flow."""

    eligible: bool
    reason: str
    publishable: bool



def classify_eligibility(vendor: str, category: str | None, direction: str) -> EligibilityResult:
    """Apply deterministic hard exclusions for payroll, taxes, and transfers."""

    haystack = f"{vendor} {category or ''}".casefold()
    if direction == "credit" or "transfer" in haystack:
        return EligibilityResult(eligible=False, reason="transfer", publishable=False)
    if "payroll" in haystack or "gusto" in haystack:
        return EligibilityResult(eligible=False, reason="payroll", publishable=False)
    if "tax" in haystack:
        return EligibilityResult(eligible=False, reason="tax", publishable=False)
    return EligibilityResult(eligible=True, reason="eligible", publishable=True)
