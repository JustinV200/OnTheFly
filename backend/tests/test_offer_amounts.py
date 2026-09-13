"""Exercises the bounds on offer and baseline amounts: no zero or negative money reaches the ranking.
A non-positive price would sort first on the public leaderboard and inflate the owner's potential savings.
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from pydantic import ValidationError
import pytest
from sqlalchemy import func, select

from app.api.listings.schemas import ScopeVersionInput
from app.cli.demo_seed import GenuineOfferLedger, LedgerEntry, seed_scenario
from app.models.challenge import Challenge, ChallengeRevision
from app.models.listing import PublicListingRecord
from app.services.challenges.submit import revise_challenge, submit_challenge

VALID_OFFER = {"price_minor": 187500, "billing_frequency": "monthly", "acknowledged_bidding_mode": "open"}


def _staged_open_listing(db_session, ledger: GenuineOfferLedger | None = None) -> PublicListingRecord:
    # The staged scenario leaves the demo owner's listing public with bidding open and two seeded offers.
    seed_scenario("staged", ledger or GenuineOfferLedger(), "fixture", db_session)
    listing = db_session.scalar(select(PublicListingRecord).where(PublicListingRecord.owner_account_id == "acc_owner_1"))
    assert listing is not None and listing.bidding_mode == "open"
    return listing


def _challenge_count(db_session) -> int:
    return db_session.scalar(select(func.count()).select_from(Challenge))


@pytest.mark.parametrize(
    "overrides",
    [
        {"price_minor": 0},
        {"price_minor": -5000},
        {"setup_fee_minor": -100000},
    ],
)
def test_api_rejects_non_positive_price_and_negative_setup_fee(client, db_session, overrides: dict) -> None:
    listing = _staged_open_listing(db_session)
    before = _challenge_count(db_session)

    response = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers={"X-Account-ID": "acc_challenger_3"},
        json={**VALID_OFFER, **overrides},
    )

    assert response.status_code == 422
    assert _challenge_count(db_session) == before
    board = client.get(f"/api/listings/{listing.id}/leaderboard").json()
    assert all(entry["normalized_price_minor"] > 0 for entry in board["entries"])


def test_api_accepts_a_zero_setup_fee(client, db_session) -> None:
    listing = _staged_open_listing(db_session)

    response = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers={"X-Account-ID": "acc_challenger_3"},
        json={**VALID_OFFER, "setup_fee_minor": 0},
    )

    assert response.status_code == 200
    assert response.json()["setup_fee_minor"] == 0


def test_api_revision_to_zero_price_is_rejected_and_keeps_the_offer(client, db_session) -> None:
    listing = _staged_open_listing(db_session)
    offer = db_session.scalar(
        select(Challenge).where(Challenge.listing_id == listing.id, Challenge.challenger_account_id == "acc_challenger_2")
    )
    assert offer is not None
    original_price = offer.price_minor

    response = client.patch(
        f"/api/challenges/{offer.id}",
        headers={"X-Account-ID": "acc_challenger_2"},
        json={**VALID_OFFER, "price_minor": 0},
    )

    db_session.expire_all()
    assert response.status_code == 422
    assert db_session.get(Challenge, offer.id).price_minor == original_price
    assert db_session.scalar(select(func.count()).select_from(ChallengeRevision)) == 0


def test_operator_submit_rejects_negative_price(db_session) -> None:
    """Seed code calls the service directly, skipping the API schema, so the service checks too."""
    listing = _staged_open_listing(db_session)
    before = _challenge_count(db_session)

    with pytest.raises(HTTPException) as raised:
        submit_challenge(listing.id, "acc_challenger_3", {"price_minor": -5000, "billing_frequency": "monthly"}, db_session)

    assert raised.value.status_code == 400
    assert _challenge_count(db_session) == before


def test_operator_revision_rejects_negative_setup_fee_without_snapshotting(db_session) -> None:
    listing = _staged_open_listing(db_session)
    offer = db_session.scalar(
        select(Challenge).where(Challenge.listing_id == listing.id, Challenge.challenger_account_id == "acc_challenger_2")
    )
    assert offer is not None

    with pytest.raises(HTTPException) as raised:
        revise_challenge(
            offer.id,
            "acc_challenger_2",
            {"price_minor": 180000, "billing_frequency": "monthly", "setup_fee_minor": -1},
            db_session,
        )

    assert raised.value.status_code == 400
    assert db_session.scalar(select(func.count()).select_from(ChallengeRevision)) == 0


@pytest.mark.parametrize("current_price_minor", [0, -240000])
def test_scope_input_rejects_non_positive_current_price(current_price_minor: int) -> None:
    with pytest.raises(ValidationError):
        ScopeVersionInput(current_price_minor=current_price_minor)


def test_scope_input_still_allows_an_unstated_current_price() -> None:
    assert ScopeVersionInput().current_price_minor is None
    assert ScopeVersionInput(current_price_minor=240000).current_price_minor == 240000


def test_restore_skips_a_ledger_offer_with_a_non_positive_price(db_session) -> None:
    """The restore path writes offers without submit_challenge, so it must refuse bad amounts itself."""
    entry = LedgerEntry.model_validate(
        {
            "account": {
                "id": "acc_real_1",
                "handle": "real-cleaner",
                "business_name": "Real Cleaner Co",
                "service_area": "San Francisco, CA",
                "created_at": "2026-09-01T00:00:00Z",
            },
            "offer": {
                "provenance": "challenger_submitted",
                "bidding_mode_at_submission": "open",
                "price_minor": 0,
                "billing_frequency": "monthly",
                "submitted_at": datetime(2026, 9, 10, 15, 30, tzinfo=timezone.utc).isoformat(),
            },
        }
    )

    summary = seed_scenario("staged", GenuineOfferLedger(entries=[entry]), "fixture", db_session)

    assert summary.genuine_offers_restored == 0
    assert len(summary.genuine_offers_skipped) == 1
    assert "price" in summary.genuine_offers_skipped[0]
    assert db_session.scalar(select(Challenge).where(Challenge.challenger_account_id == "acc_real_1")) is None
