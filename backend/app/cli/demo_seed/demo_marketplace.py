"""Publishes the demo owner's cleaning listing and seeds simulated offers through the real services.
Nothing here writes a listing or offer row directly, so the seeded state passes the same guards a user's would.
"""

from datetime import datetime, timedelta, timezone
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.provenance import OfferProvenance
from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.services.challenges.submit import submit_challenge
from app.services.listings.bidding_mode import BiddingMode, set_bidding_mode
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing

DEMO_OWNER_ID = "acc_owner_1"
DEMO_EXPENSE_VENDOR = "Sparkle Clean"
# Long enough that a rehearsal days before the demo still has an open deadline on the day.
DEMO_SCOPE_DAYS_OPEN = 14
# A second business with a comparable cleaning scope, so fly-brain similar listings has a match.
NEIGHBOR_OWNER_ID = "acc_owner_2"
NEIGHBOR_EXPENSE_VENDOR = "Brightline Janitorial"
NEIGHBOR_SCOPE_DAYS_OPEN = 21


def publish_demo_cleaning_listing(db: Session) -> PublicListingRecord:
    """Draft, preview, and publish the owner's cleaning expense with sealed bidding (the default).

    The scope is the template from plan1.md §4 and roadmap/notes/real-expense.md: illustrative
    figures, not a real business's terms. Real terms enter only through the genuine-offer ledger.
    """

    return _publish_sealed_listing(
        DEMO_OWNER_ID,
        DEMO_EXPENSE_VENDOR,
        {
            "service_area": "San Francisco Bay Area",
            "location_approximate": "San Francisco, CA",
            "square_footage": 8000,
            "visit_frequency": "3x weekly",
            "bathroom_count": 4,
            "required_tasks": json.dumps(["vacuum", "trash", "restrooms"]),
            "supplies_included": True,
            "equipment_included": True,
            "taxes_included": True,
            # A regular cadence is required: create_listing_draft rejects prices with no monthly figure.
            "current_price_minor": 240000,
            "current_price_currency": "USD",
            "billing_cadence": "monthly",
            "challenge_deadline": datetime.now(timezone.utc) + timedelta(days=DEMO_SCOPE_DAYS_OPEN),
            # Stored on the scope but hidden: show_incumbent_vendor stays False (CLAUDE.md, visibility).
            "incumbent_vendor_name": DEMO_EXPENSE_VENDOR,
        },
        db,
    )


def publish_neighbor_cleaning_listing(db: Session) -> PublicListingRecord:
    """Publish Tidewater Architecture Studio's comparable cleaning listing with sealed bidding.

    Illustrative figures for a fictional business. Its scope overlaps the demo owner's on purpose,
    so fly-brain similar listings has a real match to show. No offers are seeded on it.
    """

    return _publish_sealed_listing(
        NEIGHBOR_OWNER_ID,
        NEIGHBOR_EXPENSE_VENDOR,
        {
            "service_area": "San Francisco Bay Area",
            "location_approximate": "Oakland, CA",
            "square_footage": 7500,
            "visit_frequency": "3x weekly",
            "bathroom_count": 3,
            "required_tasks": json.dumps(["vacuum", "trash", "restrooms"]),
            "supplies_included": True,
            "equipment_included": True,
            "taxes_included": True,
            "current_price_minor": 215000,
            "current_price_currency": "USD",
            "billing_cadence": "monthly",
            "challenge_deadline": datetime.now(timezone.utc) + timedelta(days=NEIGHBOR_SCOPE_DAYS_OPEN),
            "incumbent_vendor_name": NEIGHBOR_EXPENSE_VENDOR,
        },
        db,
    )


def _publish_sealed_listing(
    owner_account_id: str,
    expense_vendor: str,
    scope_payload: dict[str, object],
    db: Session,
) -> PublicListingRecord:
    expense = db.scalar(
        select(ServiceExpense).where(
            ServiceExpense.owner_account_id == owner_account_id,
            ServiceExpense.normalized_vendor == expense_vendor,
        )
    )
    if expense is None:
        raise RuntimeError(f"The import did not produce a '{expense_vendor}' expense for {owner_account_id}")

    scope = build_scope_version(expense.id, scope_payload, db)
    choices = PublishChoices(bidding_mode=BiddingMode.sealed.value)
    listing = create_listing_draft(expense, scope, choices, db)
    db.commit()
    db.refresh(listing)

    # Publishing takes the hash of the exact preview, the same confirmation the publish flow requires.
    preview = build_public_listing(listing, expense, scope, choices)
    publish_listing(
        expense_id=expense.id,
        scope_version_id=scope.id,
        choices=choices,
        previewed_payload_hash=build_payload_hash(preview),
        acting_account_id=owner_account_id,
        db=db,
    )
    db.refresh(listing)
    return listing


def seed_demo_offers(listing: PublicListingRecord, db: Session) -> list[str]:
    """Seed one sealed offer, open bidding, then one open offer; return the new challenge ids.

    The order is the point. Bay Clean's offer stays sealed after the owner opens bidding, which
    shows non-retroactivity on screen, and Golden Gate's open offer gives the third account
    (Summit Building Services) a standing price to underbid live.
    """

    sealed_offer = submit_challenge(
        listing.id,
        "acc_challenger_1",
        {
            "price_minor": 187500,
            "billing_frequency": "monthly",
            "scope_included": ["vacuum", "trash", "restrooms", "3x weekly", "equipment"],
            "supplies_included": True,
            "taxes_included": True,
            "message_to_owner": "Can start next month.",
            "provenance": OfferProvenance.demo_data.value,
        },
        db,
    )
    set_bidding_mode(listing.id, BiddingMode.open.value, DEMO_OWNER_ID, db)
    open_offer = submit_challenge(
        listing.id,
        "acc_challenger_2",
        {
            "price_minor": 195000,
            "billing_frequency": "monthly",
            "scope_included": ["vacuum", "trash", "restrooms", "3x weekly"],
            "scope_excluded": ["equipment included"],
            "supplies_included": True,
            "taxes_included": True,
            "message_to_owner": "Equipment billed separately.",
            "provenance": OfferProvenance.demo_data.value,
        },
        db,
    )
    return [sealed_offer.id, open_offer.id]
