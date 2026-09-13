"""Combines the deterministic hard-exclusion classifier with the owner's corrections and not-publishable mark.
Sync and the owner-correction endpoint both call it, so a PATCH response and the next dashboard load agree.
"""

from app.services.expenses.corrections.owner_overrides import OwnerOverrides
from app.services.expenses.eligibility import EligibilityResult, classify_eligibility

OWNER_MARKED_INELIGIBLE_REASON = "owner_marked_ineligible"
NO_POSTED_DEBITS_REASON = "no_posted_debits"


def classify_owner_eligibility(
    vendor: str,
    category: str | None,
    overrides: OwnerOverrides,
    has_posted_charges: bool = True,
) -> EligibilityResult:
    """Return one expense group's eligibility after applying the owner's overrides.

    vendor and category are what the charges show (the group key and its most common category).
    An owner-corrected vendor or category replaces that value before classifying, because both are
    owner-correctable (CLAUDE.md, "AI boundaries"). The owner's mark can only lower the result: it
    never lifts a hard exclusion, and a hard exclusion keeps its own reason. A group with no posted
    charges is never publishable and keeps sync's existing "no_posted_debits" reason; the mark stays
    stored on the row and applies again once charges post.
    """

    if not has_posted_charges:
        return EligibilityResult(eligible=False, reason=NO_POSTED_DEBITS_REASON, publishable=False)
    classification = classify_eligibility(
        overrides.corrected_vendor or vendor,
        overrides.corrected_category or category,
    )
    if classification.publishable and overrides.marked_ineligible:
        return EligibilityResult(eligible=False, reason=OWNER_MARKED_INELIGIBLE_REASON, publishable=False)
    return classification
