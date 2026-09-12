"""Exercises challenge submission rules, revisions, and public anonymity."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.models.challenge import Challenge, ChallengeRevision
from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.services.challenges.submit import submit_challenge
from app.services.listings.bidding_mode import BiddingMode, set_bidding_mode
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing
from app.services.transactions.import_run import run_import


PROVIDER_ACCOUNT_ID = "fixture_apex_main"


def _create_public_listing(db_session, challenge_deadline=None, bidding_mode="sealed") -> PublicListingRecord:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None
    scope = build_scope_version(
        expense.id,
        {
            "service_area": "San Francisco Bay Area",
            "location_approximate": "San Francisco, CA",
            "square_footage": 8000,
            "visit_frequency": "3x weekly",
            "current_price_minor": 240000,
            "billing_cadence": "monthly",
            "challenge_deadline": challenge_deadline,
        },
        db_session,
    )
    choices = PublishChoices(bidding_mode=bidding_mode)
    listing = create_listing_draft(expense, scope, choices, db_session)
    db_session.commit()
    db_session.refresh(listing)
    preview = build_public_listing(listing, expense, scope, choices)
    publish_listing(
        expense_id=expense.id,
        scope_version_id=scope.id,
        choices=choices,
        previewed_payload_hash=build_payload_hash(preview),
        acting_account_id="acc_owner_1",
        db=db_session,
    )
    refreshed_listing = db_session.get(PublicListingRecord, listing.id)
    assert refreshed_listing is not None
    return refreshed_listing



def test_owner_cannot_bid_on_own_listing(client, db_session) -> None:
    listing = _create_public_listing(db_session)

    response = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers={"X-Account-ID": "acc_owner_1"},
        json={"price_minor": 187500, "billing_frequency": "monthly"},
    )

    assert response.status_code == 400


def test_second_submission_becomes_revision(db_session) -> None:
    listing = _create_public_listing(db_session)
    first = submit_challenge(
        listing.id,
        "acc_challenger_1",
        {"price_minor": 187500, "billing_frequency": "monthly", "scope_included": ["full scope"]},
        db_session,
    )
    second = submit_challenge(
        listing.id,
        "acc_challenger_1",
        {"price_minor": 182500, "billing_frequency": "monthly", "scope_included": ["full scope"]},
        db_session,
    )
    revision_count = db_session.scalar(select(func.count()).select_from(ChallengeRevision))

    assert first.id == second.id
    assert second.price_minor == 182500
    assert revision_count == 1


def test_sealed_offers_stay_sealed_after_mode_change(db_session) -> None:
    listing = _create_public_listing(db_session, bidding_mode="sealed")
    challenge = submit_challenge(
        listing.id,
        "acc_challenger_1",
        {"price_minor": 187500, "billing_frequency": "monthly", "scope_included": ["full scope"]},
        db_session,
    )

    set_bidding_mode(listing.id, BiddingMode.open.value, "acc_owner_1", db_session)

    stored = db_session.get(Challenge, challenge.id)
    assert stored is not None
    assert stored.bidding_mode_at_submission == BiddingMode.sealed.value


def test_after_deadline_submissions_are_rejected(client, db_session) -> None:
    listing = _create_public_listing(
        db_session,
        challenge_deadline=datetime.now(timezone.utc) - timedelta(days=1),
        bidding_mode="open",
    )

    response = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers={"X-Account-ID": "acc_challenger_1"},
        json={"price_minor": 187500, "billing_frequency": "monthly"},
    )

    assert response.status_code == 400


def test_leaderboard_never_reveals_challenger_identity(client, db_session) -> None:
    listing = _create_public_listing(db_session, bidding_mode="open")
    submit_challenge(
        listing.id,
        "acc_challenger_1",
        {"price_minor": 187500, "billing_frequency": "monthly", "scope_included": ["full scope"]},
        db_session,
    )

    response = client.get(f"/api/listings/{listing.id}/leaderboard")

    assert response.status_code == 200
    first_entry = response.json()["entries"][0]
    assert "challenger_account_id" not in first_entry
    assert "challenger_name" not in first_entry


def test_private_expense_not_in_marketplace_feed(client, db_session) -> None:
    """An expense whose listing is private must never appear in the public marketplace feed."""
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None

    # Create a draft listing but do NOT publish it.
    scope = build_scope_version(
        expense.id,
        {
            "service_area": "San Francisco Bay Area",
            "location_approximate": "San Francisco, CA",
            "square_footage": 8000,
            "visit_frequency": "3x weekly",
            "current_price_minor": 240000,
            "billing_cadence": "monthly",
        },
        db_session,
    )
    choices = PublishChoices(bidding_mode="sealed")
    listing = create_listing_draft(expense, scope, choices, db_session)
    db_session.commit()

    feed = client.get("/api/marketplace")
    assert feed.status_code == 200
    listing_ids = [entry["listing"]["id"] for entry in feed.json()["listings"]]
    assert listing.id not in listing_ids


def test_private_listing_not_accessible_by_direct_id(client, db_session) -> None:
    """A private listing must return 404 when accessed by a direct ID on the public API."""
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None

    scope = build_scope_version(
        expense.id,
        {
            "service_area": "San Francisco Bay Area",
            "location_approximate": "San Francisco, CA",
            "square_footage": 8000,
            "visit_frequency": "3x weekly",
            "current_price_minor": 240000,
            "billing_cadence": "monthly",
        },
        db_session,
    )
    choices = PublishChoices(bidding_mode="sealed")
    listing = create_listing_draft(expense, scope, choices, db_session)
    db_session.commit()

    # Must not be reachable from the public route even if you guess the ID.
    response = client.get(f"/api/marketplace/{listing.id}")
    assert response.status_code == 404


def test_challenger_cannot_see_other_challenger_identity_in_inbox(client, db_session) -> None:
    """The owner inbox exposes challenger identities; other challengers must not be able to read it."""
    listing = _create_public_listing(db_session, bidding_mode="sealed")
    submit_challenge(
        listing.id,
        "acc_challenger_1",
        {"price_minor": 187500, "billing_frequency": "monthly", "scope_included": ["full scope"]},
        db_session,
    )

    # acc_challenger_2 is NOT the owner — must be denied.
    response = client.get(
        f"/api/listings/{listing.id}/inbox",
        headers={"X-Account-ID": "acc_challenger_2"},
    )

    assert response.status_code in (403, 404)
