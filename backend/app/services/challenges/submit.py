"""Submits and revises marketplace challenges against public listings.
It enforces owner exclusion, deadlines, acknowledged bidding terms, valid amounts, the listing's currency,
and non-retroactive bidding visibility.
"""

from datetime import datetime, timezone
import json

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.visibility import ListingVisibility
from app.models.challenge import Challenge, ChallengeRevision
from app.models.listing import PublicListingRecord
from app.services.challenges.amounts import find_offer_amount_problem
from app.services.challenges.currency import find_offer_currency_problem
from app.services.challenges.provenance import resolve_offer_provenance
from app.services.listings.bidding_mode import resolve_bidding_mode



def submit_challenge(
    listing_id: str,
    challenger_account_id: str,
    form_data: dict,
    db: Session,
) -> Challenge:
    """Create a new challenge or revise the challenger's existing active one.

    form_data["acknowledged_bidding_mode"], when present, must equal the listing's current
    mode. form_data["provenance"] is honored only from operator code; the API schema has no
    such field, so web submissions get a server-resolved provenance.
    form_data["price_currency"] is optional; the offer is stored in the listing's currency.
    Raises 400 when the price is not positive, the setup fee is negative, or a sent currency
    differs from the listing's.
    """

    _ensure_valid_amounts(form_data)
    listing = _get_public_listing(listing_id, db)
    _ensure_can_submit(listing, challenger_account_id)
    _ensure_mode_acknowledged(listing, form_data.get("acknowledged_bidding_mode"))
    _ensure_listing_currency(listing, form_data.get("price_currency"))
    existing = db.scalar(
        select(Challenge).where(
            Challenge.listing_id == listing_id,
            Challenge.challenger_account_id == challenger_account_id,
            Challenge.is_active.is_(True),
        )
    )
    if existing is not None:
        return revise_challenge(existing.id, challenger_account_id, form_data, db)

    challenge = Challenge(
        listing_id=listing.id,
        scope_version_id=listing.scope_version_id,
        challenger_account_id=challenger_account_id,
        bidding_mode_at_submission=resolve_bidding_mode(listing.bidding_mode).value,
        price_minor=form_data["price_minor"],
        # The listing's exact code, not the caller's spelling: the baseline Money shares it, so
        # savings and ranking never compare two currencies (or two casings of one).
        price_currency=listing.price_currency,
        billing_frequency=form_data["billing_frequency"],
        scope_included=json.dumps(form_data.get("scope_included", [])),
        scope_excluded=json.dumps(form_data.get("scope_excluded", [])),
        scope_extras=json.dumps(form_data.get("scope_extras", [])),
        setup_fee_minor=form_data.get("setup_fee_minor", 0),
        taxes_included=form_data.get("taxes_included"),
        supplies_included=form_data.get("supplies_included"),
        minimum_term=form_data.get("minimum_term"),
        other_conditions=form_data.get("other_conditions"),
        message_to_owner=form_data.get("message_to_owner"),
        availability=form_data.get("availability"),
        offer_expiry=form_data.get("offer_expiry"),
        site_visit_required=form_data.get("site_visit_required", False),
        provenance=form_data.get("provenance") or resolve_offer_provenance(challenger_account_id),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge



def revise_challenge(
    challenge_id: str,
    challenger_account_id: str,
    form_data: dict,
    db: Session,
) -> Challenge:
    """Store a revision snapshot, then update the challenger's active offer.

    The revised offer takes the listing's currency, which also repairs an older row stored in another one.
    Raises 400 when the price is not positive, the setup fee is negative, or a sent currency differs
    from the listing's, before any snapshot is written.
    """

    _ensure_valid_amounts(form_data)
    challenge = db.scalar(
        select(Challenge).where(
            Challenge.id == challenge_id,
            Challenge.challenger_account_id == challenger_account_id,
            Challenge.is_active.is_(True),
        )
    )
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    listing = _get_public_listing(challenge.listing_id, db)
    _ensure_deadline_open(listing)
    _ensure_mode_acknowledged(listing, form_data.get("acknowledged_bidding_mode"))
    _ensure_listing_currency(listing, form_data.get("price_currency"))
    revision_number = int(
        db.scalar(
            select(func.coalesce(func.max(ChallengeRevision.revision_number), 0)).where(
                ChallengeRevision.challenge_id == challenge.id,
            )
        )
        or 0
    ) + 1
    revised_at = datetime.now(timezone.utc)
    db.add(
        ChallengeRevision(
            challenge_id=challenge.id,
            revision_number=revision_number,
            bidding_mode_at_revision=resolve_bidding_mode(listing.bidding_mode).value,
            price_minor=challenge.price_minor,
            price_currency=challenge.price_currency,
            billing_frequency=challenge.billing_frequency,
            scope_included=challenge.scope_included,
            scope_excluded=challenge.scope_excluded,
            scope_extras=challenge.scope_extras,
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
            revised_at=revised_at,
        )
    )
    challenge.scope_version_id = listing.scope_version_id
    challenge.price_minor = form_data["price_minor"]
    # The snapshot above keeps whatever currency the offer had; the live offer follows the listing.
    challenge.price_currency = listing.price_currency
    challenge.billing_frequency = form_data["billing_frequency"]
    challenge.scope_included = json.dumps(form_data.get("scope_included", []))
    challenge.scope_excluded = json.dumps(form_data.get("scope_excluded", []))
    challenge.scope_extras = json.dumps(form_data.get("scope_extras", []))
    challenge.setup_fee_minor = form_data.get("setup_fee_minor", 0)
    challenge.taxes_included = form_data.get("taxes_included")
    challenge.supplies_included = form_data.get("supplies_included")
    challenge.minimum_term = form_data.get("minimum_term")
    challenge.other_conditions = form_data.get("other_conditions")
    challenge.message_to_owner = form_data.get("message_to_owner")
    challenge.availability = form_data.get("availability")
    challenge.offer_expiry = form_data.get("offer_expiry")
    challenge.site_visit_required = form_data.get("site_visit_required", False)
    # A revision keeps the offer's origin; only operator code passes an explicit provenance.
    challenge.provenance = form_data.get("provenance") or challenge.provenance
    challenge.revised_at = revised_at
    db.commit()
    db.refresh(challenge)
    return challenge



def _get_public_listing(listing_id: str, db: Session) -> PublicListingRecord:
    listing = db.get(PublicListingRecord, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.visibility != ListingVisibility.public.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing is not public")
    return listing


def _ensure_valid_amounts(form_data: dict) -> None:
    # The API schema already bounds these, but operator code (demo seeding) calls this service
    # directly, and a non-positive amount would rank first and fabricate potential savings.
    problem = find_offer_amount_problem(form_data["price_minor"], form_data.get("setup_fee_minor", 0))
    if problem is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=problem)


def _ensure_listing_currency(listing: PublicListingRecord, offered_currency: str | None) -> None:
    # Rejected rather than silently replaced: a price typed in another currency would otherwise be
    # recorded as an amount in the listing's currency, ranked, and published under open bidding.
    problem = find_offer_currency_problem(offered_currency, listing.price_currency)
    if problem is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=problem)


def _ensure_can_submit(listing: PublicListingRecord, challenger_account_id: str) -> None:
    if listing.owner_account_id == challenger_account_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owners cannot bid on their own listings")
    _ensure_deadline_open(listing)



def _ensure_mode_acknowledged(listing: PublicListingRecord, acknowledged_mode: str | None) -> None:
    # The owner can flip the mode while a challenger is typing. Accepting the offer anyway
    # would publish a price its author was told stayed sealed (CLAUDE.md, marketplace mechanics).
    if acknowledged_mode is None:
        return
    current_mode = resolve_bidding_mode(listing.bidding_mode).value
    if acknowledged_mode != current_mode:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Bidding on this listing changed to {current_mode} after you opened the form "
                f"(you were shown {acknowledged_mode}). Nothing was submitted. "
                "Review the current terms and submit again."
            ),
        )


def _ensure_deadline_open(listing: PublicListingRecord) -> None:
    deadline = listing.challenge_deadline
    if deadline and deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if deadline and deadline <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Challenge deadline has passed")
