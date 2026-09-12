"""Exercises the demo reset's genuine-offer ledger and the live and staged seed scenarios."""

from datetime import datetime, timezone
import json

from pydantic import ValidationError
import pytest
from sqlalchemy import func, select

from app.cli.demo_seed import (
    GenuineOfferLedger,
    capture_genuine_offers,
    load_ledger,
    merge_entries,
    save_ledger,
    seed_scenario,
)
from app.cli.demo_seed.ledger import LedgerEntry
from app.models.account import Account
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.services.marketplace import find_similar_listings

REAL_SUBMITTED_AT = datetime(2026, 9, 10, 15, 30, tzinfo=timezone.utc)


def _entry(provenance: str = "captured_off_platform", evidence: str | None = "email, saved in team drive") -> LedgerEntry:
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
                "provenance": provenance,
                "bidding_mode_at_submission": "sealed",
                "price_minor": 190000,
                "billing_frequency": "monthly",
                "scope_included": ["vacuum", "trash"],
                "submitted_at": REAL_SUBMITTED_AT.isoformat(),
                "minimum_term": "12 months, subject to walkthrough",
            },
            "original_evidence": evidence,
        }
    )


def test_off_platform_entry_must_cite_its_original_evidence() -> None:
    with pytest.raises(ValidationError):
        _entry(evidence=None)


def test_off_platform_entry_cannot_claim_open_bidding() -> None:
    payload = _entry().model_dump(mode="json")
    payload["offer"]["bidding_mode_at_submission"] = "open"

    with pytest.raises(ValidationError):
        LedgerEntry.model_validate(payload)


def test_ledger_round_trips_through_its_file(tmp_path) -> None:
    path = tmp_path / "nested" / "ledger.json"

    save_ledger(path, GenuineOfferLedger(entries=[_entry()]))
    loaded = load_ledger(path)

    assert loaded.entries[0].offer.submitted_at == REAL_SUBMITTED_AT
    assert loaded.entries[0].offer.minimum_term == "12 months, subject to walkthrough"


def test_corrupt_ledger_raises_instead_of_reading_as_empty(tmp_path) -> None:
    path = tmp_path / "ledger.json"
    path.write_text("{not json", encoding="utf-8")

    with pytest.raises(ValidationError):
        load_ledger(path)


def test_merge_keeps_evidence_note_and_does_not_duplicate() -> None:
    existing = _entry(evidence="phone call notes, 2026-09-10")
    recaptured = existing.model_copy(update={"original_evidence": None})

    merged = merge_entries([existing], [recaptured])

    assert len(merged) == 1
    assert merged[0].original_evidence == "phone call notes, 2026-09-10"


def test_live_scenario_publishes_nothing(db_session) -> None:
    summary = seed_scenario("live", GenuineOfferLedger(entries=[_entry()]), "fixture", db_session)

    assert summary.transactions_imported > 0
    assert summary.public_listings == 0
    assert summary.public_expenses == 0
    assert db_session.scalar(select(func.count()).select_from(Challenge)) == 0
    assert all(
        expense.visibility == "private" for expense in db_session.scalars(select(ServiceExpense)).all()
    )
    assert summary.genuine_offers_restored == 0
    assert summary.genuine_offers_in_ledger == 1


def test_staged_scenario_restores_genuine_offer_with_real_time_and_provenance(db_session) -> None:
    summary = seed_scenario("staged", GenuineOfferLedger(entries=[_entry()]), "fixture", db_session)

    genuine = db_session.scalar(select(Challenge).where(Challenge.challenger_account_id == "acc_real_1"))
    assert genuine is not None
    assert genuine.provenance == "captured_off_platform"
    assert genuine.bidding_mode_at_submission == "sealed"
    assert genuine.submitted_at.replace(tzinfo=timezone.utc) == REAL_SUBMITTED_AT
    # The demo owner's listing plus the neighbouring business's comparable one.
    assert summary.public_listings == 2
    assert summary.demo_offers == 2


def test_staged_scenario_seeds_a_sealed_offer_before_opening_bidding(db_session) -> None:
    seed_scenario("staged", GenuineOfferLedger(), "fixture", db_session)

    listing = db_session.scalar(select(PublicListingRecord).where(PublicListingRecord.owner_account_id == "acc_owner_1"))
    modes = {
        challenge.challenger_account_id: challenge.bidding_mode_at_submission
        for challenge in db_session.scalars(select(Challenge)).all()
    }
    assert listing is not None and listing.bidding_mode == "open"
    assert modes == {"acc_challenger_1": "sealed", "acc_challenger_2": "open"}


def test_staged_scenario_gives_the_demo_listing_a_similar_neighbour(db_session) -> None:
    """Fly-brain similar listings needs a second comparable public listing to show anything."""
    seed_scenario("staged", GenuineOfferLedger(), "fixture", db_session)
    listings = {record.owner_account_id: record for record in db_session.scalars(select(PublicListingRecord)).all()}

    neighbour = listings["acc_owner_2"]
    as_challenger = find_similar_listings(listings["acc_owner_1"].id, "acc_challenger_1", db_session)
    as_neighbour_owner = find_similar_listings(listings["acc_owner_1"].id, "acc_owner_2", db_session)

    assert neighbour.bidding_mode == "sealed" and neighbour.incumbent_vendor_name is None
    assert db_session.scalar(select(func.count()).select_from(Challenge).where(Challenge.listing_id == neighbour.id)) == 0
    assert as_challenger is not None and [item.projection.id for item in as_challenger] == [neighbour.id]
    assert as_neighbour_owner == []


def test_live_scenario_imports_the_neighbour_privately(db_session) -> None:
    summary = seed_scenario("live", GenuineOfferLedger(), "fixture", db_session)

    neighbour_expenses = db_session.scalars(
        select(ServiceExpense).where(ServiceExpense.owner_account_id == "acc_owner_2")
    ).all()
    assert summary.public_listings == 0
    assert neighbour_expenses and all(expense.visibility == "private" for expense in neighbour_expenses)


def test_capture_skips_offers_from_seeded_demo_accounts(db_session) -> None:
    seed_scenario("staged", GenuineOfferLedger(entries=[_entry()]), "fixture", db_session)
    # Simulate the old form default that labeled a seeded account's live offer as genuine.
    seeded_offer = db_session.scalar(select(Challenge).where(Challenge.challenger_account_id == "acc_challenger_1"))
    assert seeded_offer is not None
    seeded_offer.provenance = "challenger_submitted"
    db_session.commit()

    capture = capture_genuine_offers(db_session, GenuineOfferLedger(entries=[_entry()]))

    assert [entry.account.id for entry in capture.entries] == ["acc_real_1"]
    assert capture.entries[0].original_evidence == "email, saved in team drive"
    assert capture.skipped_seeded_account_offers == 1
    assert json.loads(json.dumps(capture.entries[0].model_dump(mode="json")))["offer"]["price_minor"] == 190000
    assert db_session.get(Account, "acc_real_1") is not None
