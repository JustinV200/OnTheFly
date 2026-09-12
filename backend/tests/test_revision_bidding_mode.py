"""Exercises the rule that a revision records the bidding mode in force when it is made (roadmap/05 §6).
Publicity follows the mode stored on the offer, so a revision that kept its old mode let a price typed
under sealed terms reach the public leaderboard as soon as the owner reopened bidding.
"""

from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.cli.demo_seed import GenuineOfferLedger, LedgerEntry, capture_genuine_offers, seed_scenario
from app.models.challenge import Challenge, ChallengeRevision
from app.models.listing import PublicListingRecord
from app.services.challenges.submit import revise_challenge
from app.services.listings.bidding_mode import set_bidding_mode

OWNER = {"X-Account-ID": "acc_owner_1"}
# The staged seed gives Bay Clean a sealed offer (187500) and Golden Gate an open one (195000).
SEALED_CHALLENGER = "acc_challenger_1"
OPEN_CHALLENGER = "acc_challenger_2"
REAL_CHALLENGER = "acc_real_1"


def _staged_open_listing(db_session, ledger: GenuineOfferLedger | None = None) -> PublicListingRecord:
    seed_scenario("staged", ledger or GenuineOfferLedger(), "fixture", db_session)
    listing = db_session.scalar(select(PublicListingRecord).where(PublicListingRecord.owner_account_id == "acc_owner_1"))
    assert listing is not None and listing.bidding_mode == "open"
    return listing


def _offer_id(db_session, listing: PublicListingRecord, account_id: str) -> str:
    offer = db_session.scalar(
        select(Challenge).where(Challenge.listing_id == listing.id, Challenge.challenger_account_id == account_id)
    )
    assert offer is not None
    return offer.id


def _set_mode(client, listing: PublicListingRecord, mode: str) -> None:
    response = client.post(f"/api/listings/{listing.id}/bidding-mode", headers=OWNER, json={"mode": mode})
    assert response.status_code == 200, response.text


def _revise(client, listing: PublicListingRecord, offer_id: str, account_id: str, mode: str, price_minor: int, route: str):
    # The challenge form POSTs to the listing (which revises an existing offer); PATCH is the direct route.
    body = {"price_minor": price_minor, "billing_frequency": "monthly", "acknowledged_bidding_mode": mode}
    headers = {"X-Account-ID": account_id}
    if route == "post":
        return client.post(f"/api/listings/{listing.id}/challenges", headers=headers, json=body)
    return client.patch(f"/api/challenges/{offer_id}", headers=headers, json=body)


def _public_prices(client, listing: PublicListingRecord) -> list[int]:
    response = client.get(f"/api/listings/{listing.id}/leaderboard")
    assert response.status_code == 200, response.text
    return [entry["normalized_price_minor"] for entry in response.json()["entries"]]


@pytest.mark.parametrize("route", ["post", "patch"])
def test_price_revised_under_sealed_terms_stays_private_after_bidding_reopens(client, db_session, route: str) -> None:
    listing = _staged_open_listing(db_session)
    offer_id = _offer_id(db_session, listing, OPEN_CHALLENGER)
    _set_mode(client, listing, "sealed")

    revised = _revise(client, listing, offer_id, OPEN_CHALLENGER, "sealed", 150000, route)
    _set_mode(client, listing, "open")

    assert revised.status_code == 200, revised.text
    assert revised.json()["bidding_mode_at_submission"] == "sealed"
    board = client.get(f"/api/listings/{listing.id}/leaderboard")
    assert board.json()["entries"] == []
    assert board.json()["sealed_offer_count"] == 2
    # Neither the sealed revision nor the open price it replaced is published.
    assert "150000" not in board.text and "195000" not in board.text


def test_revision_acknowledging_open_terms_is_recorded_open(client, db_session) -> None:
    """The form warned that the price will be visible, so the revised offer must not stay sealed."""
    listing = _staged_open_listing(db_session)
    offer_id = _offer_id(db_session, listing, SEALED_CHALLENGER)

    revised = _revise(client, listing, offer_id, SEALED_CHALLENGER, "open", 180000, "post")

    db_session.expire_all()
    assert revised.status_code == 200, revised.text
    assert revised.json()["bidding_mode_at_submission"] == "open"
    assert db_session.get(Challenge, offer_id).bidding_mode_at_submission == "open"
    assert sorted(_public_prices(client, listing)) == [180000, 195000]
    # The sealed price it replaced survives only in the private revision history.
    assert "187500" not in client.get(f"/api/listings/{listing.id}/leaderboard").text


def test_revision_rows_record_the_mode_each_old_version_was_made_under(client, db_session) -> None:
    listing = _staged_open_listing(db_session)
    open_offer_id = _offer_id(db_session, listing, OPEN_CHALLENGER)
    sealed_offer_id = _offer_id(db_session, listing, SEALED_CHALLENGER)

    _set_mode(client, listing, "sealed")
    assert _revise(client, listing, open_offer_id, OPEN_CHALLENGER, "sealed", 150000, "patch").status_code == 200
    _set_mode(client, listing, "open")
    assert _revise(client, listing, open_offer_id, OPEN_CHALLENGER, "open", 140000, "post").status_code == 200
    assert _revise(client, listing, sealed_offer_id, SEALED_CHALLENGER, "open", 180000, "post").status_code == 200

    db_session.expire_all()
    rows = db_session.scalars(select(ChallengeRevision).order_by(ChallengeRevision.revision_number)).all()
    history = {
        offer_id: [(row.revision_number, row.bidding_mode_at_revision, row.price_minor) for row in rows if row.challenge_id == offer_id]
        for offer_id in (open_offer_id, sealed_offer_id)
    }
    assert history[open_offer_id] == [(1, "open", 195000), (2, "sealed", 150000)]
    assert history[sealed_offer_id] == [(1, "sealed", 187500)]
    current = db_session.get(Challenge, open_offer_id)
    assert (current.bidding_mode_at_submission, current.price_minor) == ("open", 140000)


def test_operator_revision_without_an_acknowledgement_takes_the_mode_in_force(client, db_session) -> None:
    """Seed code calls the service directly with no acknowledged mode; it must not inherit an open one."""
    listing = _staged_open_listing(db_session)
    offer_id = _offer_id(db_session, listing, OPEN_CHALLENGER)
    # Sealed through this session, so the service call below doesn't read a stale cached listing.
    set_bidding_mode(listing.id, "sealed", "acc_owner_1", db_session)

    revised = revise_challenge(offer_id, OPEN_CHALLENGER, {"price_minor": 150000, "billing_frequency": "monthly"}, db_session)
    _set_mode(client, listing, "open")

    assert revised.bidding_mode_at_submission == "sealed"
    assert _public_prices(client, listing) == []


def _captured_quote() -> LedgerEntry:
    return LedgerEntry.model_validate(
        {
            "account": {
                "id": REAL_CHALLENGER,
                "handle": "real-cleaner",
                "business_name": "Real Cleaner Co",
                "service_area": "San Francisco, CA",
                "created_at": "2026-09-01T00:00:00Z",
            },
            "offer": {
                "provenance": "captured_off_platform",
                "bidding_mode_at_submission": "sealed",
                "price_minor": 190000,
                "billing_frequency": "monthly",
                "submitted_at": datetime(2026, 9, 10, 15, 30, tzinfo=timezone.utc).isoformat(),
            },
            "original_evidence": "email, saved in team drive",
        }
    )


def test_captured_off_platform_offer_stays_sealed_when_revised_and_can_still_be_captured(client, db_session) -> None:
    """The genuine-offer ledger only accepts a captured quote as sealed, so a revision can't make it open."""
    listing = _staged_open_listing(db_session, GenuineOfferLedger(entries=[_captured_quote()]))
    offer_id = _offer_id(db_session, listing, REAL_CHALLENGER)

    revised = _revise(client, listing, offer_id, REAL_CHALLENGER, "open", 170000, "post")
    capture = capture_genuine_offers(db_session, GenuineOfferLedger(entries=[_captured_quote()]))

    assert revised.status_code == 200, revised.text
    assert revised.json()["bidding_mode_at_submission"] == "sealed"
    assert 170000 not in _public_prices(client, listing)
    captured = [entry.offer for entry in capture.entries if entry.account.id == REAL_CHALLENGER]
    assert [(offer.bidding_mode_at_submission, offer.price_minor) for offer in captured] == [("sealed", 170000)]
