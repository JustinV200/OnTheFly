"""Exercises the visibility audit trail written when an owner changes a listing's bidding mode.
Opening or sealing bidding changes the served public payload, so each real change is audited.
"""

import json

from sqlalchemy import func, select

from app.cli.demo_seed import GenuineOfferLedger, seed_scenario
from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.models.visibility_audit import VisibilityAudit
from app.services.listings.bidding_mode import BiddingMode, set_bidding_mode
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing, projection_from_record
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing, unpublish_listing
from app.services.transactions.import_run import run_import

OWNER_ID = "acc_owner_1"
PROVIDER_ACCOUNT_ID = "fixture_apex_main"


def _create_public_listing(db_session) -> PublicListingRecord:
    run_import(OWNER_ID, PROVIDER_ACCOUNT_ID, db_session)
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
    choices = PublishChoices(bidding_mode=BiddingMode.sealed.value)
    listing = create_listing_draft(expense, scope, choices, db_session)
    db_session.commit()
    db_session.refresh(listing)
    publish_listing(
        expense_id=expense.id,
        scope_version_id=scope.id,
        choices=choices,
        previewed_payload_hash=build_payload_hash(build_public_listing(listing, expense, scope, choices)),
        acting_account_id=OWNER_ID,
        db=db_session,
    )
    stored = db_session.get(PublicListingRecord, listing.id)
    assert stored is not None
    return stored


def _mode_audits(db_session, expense_id: str) -> list[VisibilityAudit]:
    # Publication rows share the table; only bidding-mode rows carry the "bidding_mode:" prefix.
    rows = db_session.scalars(select(VisibilityAudit).where(VisibilityAudit.expense_id == expense_id))
    return [row for row in rows if row.new_state.startswith("bidding_mode:")]


def _audit_count(db_session) -> int:
    return int(db_session.scalar(select(func.count()).select_from(VisibilityAudit)) or 0)


def test_opening_bidding_audits_the_owner_and_the_payload_now_served(db_session) -> None:
    listing = _create_public_listing(db_session)

    set_bidding_mode(listing.id, BiddingMode.open.value, OWNER_ID, db_session)

    audits = _mode_audits(db_session, listing.expense_id)
    assert len(audits) == 1
    audit = audits[0]
    assert audit.account_id == OWNER_ID
    assert audit.previous_state == "bidding_mode:sealed"
    assert audit.new_state == "bidding_mode:open"
    assert audit.public_payload_snapshot is not None
    served = projection_from_record(db_session.get(PublicListingRecord, listing.id)).model_dump(mode="json")
    snapshot = json.loads(audit.public_payload_snapshot)
    assert snapshot == served
    assert snapshot["bidding_mode"] == "open" and snapshot["visibility"] == "public"


def test_setting_the_mode_already_in_force_writes_no_audit(db_session) -> None:
    listing = _create_public_listing(db_session)
    before = _audit_count(db_session)

    set_bidding_mode(listing.id, BiddingMode.sealed.value, OWNER_ID, db_session)
    # An unrecognised value resolves to sealed, which is already in force.
    set_bidding_mode(listing.id, "sideways", OWNER_ID, db_session)

    assert _audit_count(db_session) == before
    assert db_session.get(PublicListingRecord, listing.id).bidding_mode == "sealed"


def test_toggling_a_private_listing_is_audited_because_the_next_publish_serves_it(db_session) -> None:
    listing = _create_public_listing(db_session)
    unpublish_listing(listing.id, OWNER_ID, db_session)

    set_bidding_mode(listing.id, BiddingMode.open.value, OWNER_ID, db_session)
    set_bidding_mode(listing.id, BiddingMode.sealed.value, OWNER_ID, db_session)

    audits = _mode_audits(db_session, listing.expense_id)
    transitions = sorted((row.previous_state, row.new_state) for row in audits)
    assert transitions == [
        ("bidding_mode:open", "bidding_mode:sealed"),
        ("bidding_mode:sealed", "bidding_mode:open"),
    ]
    for row in audits:
        assert row.public_payload_snapshot is not None
        assert json.loads(row.public_payload_snapshot)["visibility"] == "private"


def test_staged_seed_audits_the_bidding_it_opens(db_session) -> None:
    """The staged demo opens bidding after publishing sealed; the trail must end on what is served."""
    seed_scenario("staged", GenuineOfferLedger(), "fixture", db_session)
    listing = db_session.scalar(select(PublicListingRecord).where(PublicListingRecord.owner_account_id == OWNER_ID))
    assert listing is not None and listing.bidding_mode == "open"

    audits = _mode_audits(db_session, listing.expense_id)

    assert [(row.previous_state, row.new_state) for row in audits] == [("bidding_mode:sealed", "bidding_mode:open")]
    assert json.loads(audits[0].public_payload_snapshot or "{}") == projection_from_record(listing).model_dump(mode="json")


def test_bidding_mode_route_audits_the_acting_owner_and_refuses_other_accounts(client, db_session) -> None:
    listing = _create_public_listing(db_session)
    before = _audit_count(db_session)

    refused = client.post(
        f"/api/listings/{listing.id}/bidding-mode",
        headers={"X-Account-ID": "acc_challenger_1"},
        json={"mode": "open"},
    )
    assert refused.status_code == 404
    assert _audit_count(db_session) == before

    response = client.post(
        f"/api/listings/{listing.id}/bidding-mode",
        headers={"X-Account-ID": OWNER_ID},
        json={"mode": "open"},
    )
    assert response.status_code == 200
    audits = _mode_audits(db_session, listing.expense_id)
    assert [(row.account_id, row.new_state) for row in audits] == [(OWNER_ID, "bidding_mode:open")]
