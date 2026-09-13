"""Exercises the rule that an offer is always priced in the currency of the listing it answers.
Savings subtract each offer from the listing's baseline and Money refuses cross-currency math, so one
mismatched offer used to return 500 for the owner's whole inbox and misrank the public leaderboard.
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
from app.models.service_expense import ServiceExpense
from app.services.challenges.submit import revise_challenge, submit_challenge
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing
from app.services.transactions.import_run import run_import

OWNER = {"X-Account-ID": "acc_owner_1"}
VALID_OFFER = {"price_minor": 187500, "billing_frequency": "monthly", "acknowledged_bidding_mode": "open"}


def _staged_usd_listing(db_session, ledger: GenuineOfferLedger | None = None) -> PublicListingRecord:
    # The staged scenario leaves the demo owner's USD listing public with bidding open and two seeded offers.
    seed_scenario("staged", ledger or GenuineOfferLedger(), "fixture", db_session)
    listing = db_session.scalar(select(PublicListingRecord).where(PublicListingRecord.owner_account_id == "acc_owner_1"))
    assert listing is not None and listing.bidding_mode == "open" and listing.price_currency == "USD"
    return listing


def _eur_listing(db_session) -> PublicListingRecord:
    # A euro expense published through the real draft and publish services, with bidding open.
    run_import("acc_owner_1", "fixture_apex_main", db_session)
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None
    expense.currency = "EUR"
    scope = build_scope_version(
        expense.id,
        {"current_price_minor": 200000, "current_price_currency": "EUR", "billing_cadence": "monthly"},
        db_session,
    )
    choices = PublishChoices(bidding_mode="open")
    listing = create_listing_draft(expense, scope, choices, db_session)
    db_session.commit()
    db_session.refresh(listing)
    publish_listing(
        expense_id=expense.id,
        scope_version_id=scope.id,
        choices=choices,
        previewed_payload_hash=build_payload_hash(build_public_listing(listing, expense, scope, choices)),
        acting_account_id="acc_owner_1",
        db=db_session,
    )
    db_session.refresh(listing)
    assert listing.price_currency == "EUR"
    return listing


def _offer_from(db_session, listing: PublicListingRecord, account_id: str) -> Challenge:
    offer = db_session.scalar(
        select(Challenge).where(Challenge.listing_id == listing.id, Challenge.challenger_account_id == account_id)
    )
    assert offer is not None
    return offer


def _assert_owner_views_load(client, listing: PublicListingRecord) -> None:
    inbox = client.get(f"/api/listings/{listing.id}/inbox", headers=OWNER)
    comparison = client.get(f"/api/listings/{listing.id}/comparison", headers=OWNER)
    assert inbox.status_code == 200, inbox.text
    assert comparison.status_code == 200, comparison.text
    assert {row["price_currency"] for row in inbox.json()["challenges"]} == {listing.price_currency}


def test_api_rejects_an_offer_in_another_currency_and_keeps_the_inbox_working(client, db_session) -> None:
    listing = _staged_usd_listing(db_session)
    before = db_session.scalar(select(func.count()).select_from(Challenge))

    response = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers={"X-Account-ID": "acc_challenger_3"},
        json={**VALID_OFFER, "price_currency": "EUR"},
    )

    assert response.status_code == 400
    assert "USD" in response.json()["detail"]
    assert db_session.scalar(select(func.count()).select_from(Challenge)) == before
    _assert_owner_views_load(client, listing)


def test_api_accepts_a_lowercase_code_but_stores_the_listing_currency(client, db_session) -> None:
    listing = _staged_usd_listing(db_session)

    response = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers={"X-Account-ID": "acc_challenger_3"},
        json={**VALID_OFFER, "price_currency": "usd"},
    )

    assert response.status_code == 200
    assert response.json()["price_currency"] == "USD"
    _assert_owner_views_load(client, listing)
    board = client.get(f"/api/listings/{listing.id}/leaderboard").json()
    assert {entry["price_currency"] for entry in board["entries"]} == {"USD"}


def test_api_revision_in_another_currency_is_rejected_without_a_snapshot(client, db_session) -> None:
    listing = _staged_usd_listing(db_session)
    offer = _offer_from(db_session, listing, "acc_challenger_2")

    response = client.patch(
        f"/api/challenges/{offer.id}",
        headers={"X-Account-ID": "acc_challenger_2"},
        json={**VALID_OFFER, "price_minor": 100, "price_currency": "EUR"},
    )

    db_session.expire_all()
    assert response.status_code == 400
    assert "USD" in response.json()["detail"]
    stored = db_session.get(Challenge, offer.id)
    assert stored.price_currency == "USD" and stored.price_minor != 100
    assert db_session.scalar(select(func.count()).select_from(ChallengeRevision)) == 0
    _assert_owner_views_load(client, listing)


def test_ui_offer_on_a_euro_listing_is_stored_in_euros(client, db_session) -> None:
    """The challenge form never sends a currency; the offer must take the listing's, not USD."""
    listing = _eur_listing(db_session)

    submitted = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers={"X-Account-ID": "acc_challenger_1"},
        json=VALID_OFFER,
    )
    revised = client.patch(
        f"/api/challenges/{submitted.json()['id']}",
        headers={"X-Account-ID": "acc_challenger_1"},
        json={**VALID_OFFER, "price_minor": 180000},
    )

    assert submitted.status_code == 200 and submitted.json()["price_currency"] == "EUR"
    assert revised.status_code == 200 and revised.json()["price_currency"] == "EUR"
    _assert_owner_views_load(client, listing)


def test_operator_submit_rejects_another_currency(db_session) -> None:
    """Seed code calls the service directly, skipping the API schema, so the service checks too."""
    listing = _staged_usd_listing(db_session)

    with pytest.raises(HTTPException) as raised:
        submit_challenge(
            listing.id,
            "acc_challenger_3",
            {"price_minor": 187500, "price_currency": "EUR", "billing_frequency": "monthly"},
            db_session,
        )

    assert raised.value.status_code == 400
    assert db_session.scalar(select(Challenge).where(Challenge.challenger_account_id == "acc_challenger_3")) is None


def test_operator_revision_without_a_currency_repairs_a_mismatched_legacy_offer(db_session) -> None:
    listing = _staged_usd_listing(db_session)
    offer = _offer_from(db_session, listing, "acc_challenger_2")
    # A row written before the rule existed, when any string was stored as given.
    offer.price_currency = "usd"
    db_session.commit()

    revised = revise_challenge(offer.id, "acc_challenger_2", {"price_minor": 190000, "billing_frequency": "monthly"}, db_session)

    assert revised.price_currency == "USD"
    snapshot = db_session.scalar(select(ChallengeRevision).where(ChallengeRevision.challenge_id == offer.id))
    assert snapshot is not None and snapshot.price_currency == "usd"


def test_scope_input_upper_cases_the_current_price_currency() -> None:
    assert ScopeVersionInput(current_price_currency=" eur ").current_price_currency == "EUR"
    assert ScopeVersionInput().current_price_currency == "USD"


@pytest.mark.parametrize("currency", ["", "US", "USDX", "U$D", "12A", "dollars"])
def test_scope_input_rejects_a_value_that_is_not_a_currency_code(currency: str) -> None:
    with pytest.raises(ValidationError):
        ScopeVersionInput(current_price_currency=currency)


def _ledger_entry(price_currency: str) -> LedgerEntry:
    return LedgerEntry.model_validate(
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
                "price_minor": 180000,
                "price_currency": price_currency,
                "billing_frequency": "monthly",
                "submitted_at": datetime(2026, 9, 10, 15, 30, tzinfo=timezone.utc).isoformat(),
            },
        }
    )


def test_restore_skips_a_ledger_offer_in_another_currency(client, db_session) -> None:
    """The restore path writes offers without submit_challenge, so it must refuse a mismatch itself."""
    summary = seed_scenario("staged", GenuineOfferLedger(entries=[_ledger_entry("EUR")]), "fixture", db_session)

    assert summary.genuine_offers_restored == 0
    assert len(summary.genuine_offers_skipped) == 1 and "USD" in summary.genuine_offers_skipped[0]
    assert db_session.scalar(select(Challenge).where(Challenge.challenger_account_id == "acc_real_1")) is None
    listing = db_session.scalar(select(PublicListingRecord).where(PublicListingRecord.owner_account_id == "acc_owner_1"))
    _assert_owner_views_load(client, listing)


def test_restore_stores_a_lowercase_ledger_code_as_the_listing_currency(client, db_session) -> None:
    listing = _staged_usd_listing(db_session, GenuineOfferLedger(entries=[_ledger_entry("usd")]))

    restored = db_session.scalar(select(Challenge).where(Challenge.challenger_account_id == "acc_real_1"))
    assert restored is not None and restored.price_currency == "USD"
    _assert_owner_views_load(client, listing)
