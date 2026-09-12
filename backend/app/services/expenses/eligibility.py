"""Classifies whether a grouped expense is eligible and publishable.
Hard exclusions stay hard exclusions regardless of any later UI action.
"""

from pydantic import BaseModel

from app.services.expenses.exclusions import classify_spend_exclusion


class EligibilityResult(BaseModel):
    """States whether a grouped expense may appear in the publish flow."""

    eligible: bool
    reason: str
    publishable: bool



def classify_eligibility(vendor: str, category: str | None) -> EligibilityResult:
    """Apply deterministic hard exclusions for payroll, taxes, and transfers to one vendor group.

    Uses the same classifier the import applies to each transaction. Direction is deliberately
    not an input: an outbound transfer arrives as a debit like any vendor payment, and one
    group's rows can mix debits with refunds. Ordinary refunds and credits reduce net spend and
    reconcile against the group rather than making it ineligible.
    """

    reason = classify_spend_exclusion(vendor, category)
    if reason is not None:
        return EligibilityResult(eligible=False, reason=reason, publishable=False)
    return EligibilityResult(eligible=True, reason="eligible", publishable=True)
