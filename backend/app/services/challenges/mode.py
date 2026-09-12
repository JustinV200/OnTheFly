"""Decides which bidding mode one version of an offer is recorded under.
Publicity is read from that stored mode, never the listing's current one, so it is decided once per version:
at submission and again at every revision (roadmap/05 §6). This module stores nothing.
"""

from app.core.provenance import OfferProvenance
from app.services.listings.bidding_mode import BiddingMode, resolve_bidding_mode


def resolve_offer_bidding_mode(listing_mode: str | None, provenance: str) -> str:
    """Return the mode a new or revised offer version is recorded under.

    listing_mode is the listing's stored mode when the version is saved. API callers have already
    acknowledged it (a mismatch is a 409), so it is the mode the challenger was shown; an unset or
    unknown value is sealed. provenance is the label the saved version will carry.
    """

    # An original quote captured off-platform never saw this listing's terms, and a revision keeps that
    # label. The genuine-offer ledger rejects such an offer in any mode but sealed (app/cli/demo_seed/ledger.py),
    # so recording it open would break the capture that protects it across a demo reset.
    if provenance == OfferProvenance.captured_off_platform.value:
        return BiddingMode.sealed.value
    return resolve_bidding_mode(listing_mode).value
