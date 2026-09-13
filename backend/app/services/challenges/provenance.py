"""Decides an offer's provenance on the server instead of trusting the submitting client.
A seeded demo business is fictional, so anything it offers is demo data even when typed in live.
"""

from app.core.provenance import OfferProvenance
from app.db.seed import SEEDED_ACCOUNTS

SEEDED_ACCOUNT_IDS = frozenset(account["id"] for account in SEEDED_ACCOUNTS)


def resolve_offer_provenance(challenger_account_id: str) -> str:
    """Return demo_data for seeded demo accounts and challenger_submitted for any other account.

    captured_off_platform is never inferred here: it is set only by the operator path that
    restores a real quote with its original evidence (app/cli/demo_seed). Letting the challenge
    form choose would let a simulated offer claim to be genuine (roadmap 09, "Honest labeling of the demo's seams").
    """

    if challenger_account_id in SEEDED_ACCOUNT_IDS:
        return OfferProvenance.demo_data.value
    return OfferProvenance.challenger_submitted.value
