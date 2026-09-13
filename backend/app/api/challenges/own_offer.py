"""Serves a challenger its own active offer on a listing, so the challenge form can revise it from its stored terms.
Only the acting account's offer is ever read or returned: never another challenger's offer, identity, or count.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.challenges.schemas import OwnOffer, OwnOfferResponse
from app.core.identity import require_acting_account_id
from app.db.session import get_db
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.models.scope import ChallengeRequirementResponse
from app.services.challenges.own_offer import find_own_active_offer
from app.services.challenges.requirement_responses import RequirementResponseInput, load_current_responses
from app.services.listings.bidding_mode import resolve_bidding_mode

router = APIRouter(tags=["challenges"])

NO_OFFER_MESSAGE = "You have no active offer on this listing."


@router.get("/api/listings/{listing_id}/my-offer", response_model=OwnOfferResponse)
def get_own_offer(listing_id: str, request: Request, db: Session = Depends(get_db)) -> OwnOfferResponse:
    """Return the acting account's own active offer on the listing, or offer=None when it has none.

    A missing X-Account-ID is a 401, like every account-scoped route. An unknown listing, and an owner
    asking about their own listing, get the same empty result as a challenger with no offer yet.
    """

    acting_account_id = require_acting_account_id(request)
    challenge = find_own_active_offer(listing_id, acting_account_id, db)
    if challenge is None:
        return OwnOfferResponse(offer=None, message=NO_OFFER_MESSAGE)
    # Not filtered on visibility: an offer on a since-unpublished listing is still its author's own data,
    # and nothing below reads from the listing except which scope version it currently has.
    listing = db.get(PublicListingRecord, challenge.listing_id)
    responses = load_current_responses([challenge.id], db)[challenge.id]
    return OwnOfferResponse(offer=build_own_offer(challenge, listing, [_response(row) for row in responses]))


def build_own_offer(
    challenge: Challenge,
    listing: PublicListingRecord | None,
    requirement_responses: list[RequirementResponseInput] | None = None,
) -> OwnOffer:
    """Build the author's view of an offer field by field; listing is the offer's listing, if it still exists."""

    return OwnOffer(
        id=challenge.id,
        listing_id=challenge.listing_id,
        bidding_mode_at_submission=resolve_bidding_mode(challenge.bidding_mode_at_submission).value,
        price_minor=challenge.price_minor,
        price_currency=challenge.price_currency,
        billing_frequency=challenge.billing_frequency,
        scope_included=json.loads(challenge.scope_included),
        scope_excluded=json.loads(challenge.scope_excluded),
        scope_extras=json.loads(challenge.scope_extras),
        setup_fee_minor=challenge.setup_fee_minor,
        taxes_included=challenge.taxes_included,
        supplies_included=challenge.supplies_included,
        minimum_term=challenge.minimum_term,
        other_conditions=challenge.other_conditions,
        message_to_owner=challenge.message_to_owner,
        availability=challenge.availability,
        offer_expiry=challenge.offer_expiry,
        site_visit_required=challenge.site_visit_required,
        provenance=challenge.provenance,
        submitted_at=challenge.submitted_at,
        revised_at=challenge.revised_at,
        answers_current_scope=listing is not None and listing.scope_version_id == challenge.scope_version_id,
        requirement_responses=requirement_responses or [],
    )


def _response(row: ChallengeRequirementResponse) -> RequirementResponseInput:
    return RequirementResponseInput(requirement_key=row.requirement_key, is_included=row.is_included, note=row.note)
