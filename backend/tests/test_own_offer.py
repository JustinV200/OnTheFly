"""Exercises GET /api/listings/{id}/my-offer, which prefills a returning challenger's revision.
Without it the challenge form started blank, and a price-only resubmission replaced the stored scope with nothing.
The route must return the caller's own offer and nothing about anyone else's.
"""

from sqlalchemy import select

from app.cli.demo_seed import GenuineOfferLedger, seed_scenario
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.services.listings.create import build_scope_version

OWNER_ID = "acc_owner_1"
# The staged seed gives Bay Clean a sealed offer (187500) and Golden Gate an open one (195000).
SEALED_CHALLENGER = "acc_challenger_1"
OPEN_CHALLENGER = "acc_challenger_2"
NO_OFFER_CHALLENGER = "acc_challenger_3"
SEEDED_PRICES = ("187500", "195000")


def _staged_listing(db_session) -> PublicListingRecord:
    seed_scenario("staged", GenuineOfferLedger(), "fixture", db_session)
    listing = db_session.scalar(select(PublicListingRecord).where(PublicListingRecord.owner_account_id == OWNER_ID))
    assert listing is not None
    return listing


def _my_offer(client, listing_id: str, account_id: str | None):
    headers = {"X-Account-ID": account_id} if account_id else {}
    return client.get(f"/api/listings/{listing_id}/my-offer", headers=headers)


def test_challenger_gets_its_own_stored_terms(client, db_session) -> None:
    listing = _staged_listing(db_session)

    response = _my_offer(client, listing.id, SEALED_CHALLENGER)

    assert response.status_code == 200, response.text
    offer = response.json()["offer"]
    assert offer["price_minor"] == 187500
    assert offer["bidding_mode_at_submission"] == "sealed"
    assert offer["scope_included"] == ["vacuum", "trash", "restrooms", "3x weekly", "equipment"]
    assert (offer["supplies_included"], offer["taxes_included"]) == (True, True)
    assert offer["message_to_owner"] == "Can start next month."
    assert offer["answers_current_scope"] is True
    # Its only reader is the challenger, so it names no one, and the other challenger's price is absent.
    assert "challenger_account_id" not in offer and "challenger_name" not in offer
    assert "195000" not in response.text


def test_each_challenger_sees_only_its_own_offer(client, db_session) -> None:
    listing = _staged_listing(db_session)

    open_offer = _my_offer(client, listing.id, OPEN_CHALLENGER).json()["offer"]

    assert open_offer["price_minor"] == 195000
    assert open_offer["bidding_mode_at_submission"] == "open"
    assert "187500" not in _my_offer(client, listing.id, OPEN_CHALLENGER).text


def test_challenger_without_an_offer_gets_an_empty_result_revealing_no_one_elses(client, db_session) -> None:
    listing = _staged_listing(db_session)

    response = _my_offer(client, listing.id, NO_OFFER_CHALLENGER)

    assert response.status_code == 200, response.text
    assert response.json()["offer"] is None
    assert response.json()["message"]
    assert not any(price in response.text for price in SEEDED_PRICES)


def test_owner_has_no_offer_on_its_own_listing(client, db_session) -> None:
    listing = _staged_listing(db_session)

    response = _my_offer(client, listing.id, OWNER_ID)

    assert response.status_code == 200, response.text
    assert response.json()["offer"] is None
    # The owner reads offers in the inbox; this route must not become a second, identity-bearing path.
    assert not any(price in response.text for price in SEEDED_PRICES)


def test_missing_account_header_is_rejected(client, db_session) -> None:
    listing = _staged_listing(db_session)

    response = _my_offer(client, listing.id, None)

    assert response.status_code == 401
    assert not any(price in response.text for price in SEEDED_PRICES)


def test_unknown_listing_reads_the_same_as_no_offer(client, db_session) -> None:
    _staged_listing(db_session)

    response = _my_offer(client, "no-such-listing", SEALED_CHALLENGER)

    assert response.status_code == 200, response.text
    assert response.json()["offer"] is None


def test_inactive_offer_is_not_returned(client, db_session) -> None:
    listing = _staged_listing(db_session)
    offer = db_session.scalar(
        select(Challenge).where(Challenge.listing_id == listing.id, Challenge.challenger_account_id == SEALED_CHALLENGER)
    )
    offer.is_active = False
    db_session.commit()

    assert _my_offer(client, listing.id, SEALED_CHALLENGER).json()["offer"] is None


def test_offer_on_an_earlier_scope_version_says_so(client, db_session) -> None:
    listing = _staged_listing(db_session)
    rescoped = build_scope_version(listing.expense_id, {"visit_frequency": "5x weekly", "current_price_minor": 240000}, db_session)
    listing.scope_version_id = rescoped.id
    db_session.commit()

    offer = _my_offer(client, listing.id, SEALED_CHALLENGER).json()["offer"]

    assert offer["answers_current_scope"] is False


def test_revision_through_the_form_route_is_what_my_offer_returns(client, db_session) -> None:
    """The route the form submits to revises exactly the offer my-offer showed as the challenger's own."""
    listing = _staged_listing(db_session)
    shown = _my_offer(client, listing.id, OPEN_CHALLENGER).json()["offer"]
    body = {
        "acknowledged_bidding_mode": "open",
        "price_minor": 180000,
        "billing_frequency": "monthly",
        "scope_included": shown["scope_included"],
        "scope_excluded": shown["scope_excluded"],
        "supplies_included": shown["supplies_included"],
        "taxes_included": shown["taxes_included"],
    }

    revised = client.post(f"/api/listings/{listing.id}/challenges", headers={"X-Account-ID": OPEN_CHALLENGER}, json=body)
    after = _my_offer(client, listing.id, OPEN_CHALLENGER).json()["offer"]

    assert revised.status_code == 200, revised.text
    assert after["id"] == shown["id"]
    assert (after["price_minor"], after["scope_included"]) == (180000, shown["scope_included"])
    assert after["revised_at"] is not None
