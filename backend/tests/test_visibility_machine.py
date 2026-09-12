"""Exercises guarded listing visibility transitions and audit persistence."""

from fastapi import HTTPException
import pytest
from sqlalchemy import func, select

from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.models.visibility_audit import VisibilityAudit
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing, unpublish_listing
from app.services.transactions.import_run import run_import


PROVIDER_ACCOUNT_ID = "fixture_apex_main"


def test_publish_and_unpublish_write_audit_records(db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    expense = db_session.scalar(
        select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean")
    )
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
            "incumbent_vendor_name": "Sparkle Clean",
        },
        db_session,
    )
    listing = create_listing_draft(expense, scope, PublishChoices(), db_session)
    db_session.commit()
    db_session.refresh(listing)

    preview = publish_listing(
        expense_id=expense.id,
        scope_version_id=scope.id,
        choices=PublishChoices(),
        previewed_payload_hash=build_payload_hash(
            build_public_listing(listing, expense, scope, PublishChoices())
        ),
        acting_account_id="acc_owner_1",
        db=db_session,
    )
    unpublished = unpublish_listing(listing.id, "acc_owner_1", db_session)
    audit_count = db_session.scalar(select(func.count()).select_from(VisibilityAudit))

    assert preview.visibility == "public"
    assert unpublished.visibility == "private"
    assert audit_count == 3


def test_draft_rejects_a_price_with_no_monthly_figure(db_session) -> None:
    """Irregular spend with no owner-stated cadence can't become a comparable listing."""
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None
    expense.cadence = "irregular"
    scope = build_scope_version(expense.id, {"service_area": "Bay Area"}, db_session)

    with pytest.raises(HTTPException) as raised:
        create_listing_draft(expense, scope, PublishChoices(), db_session)

    assert raised.value.status_code == 400
    assert "irregular" in raised.value.detail


def test_draft_records_the_confirmed_price_on_the_scope_version(db_session) -> None:
    """The baseline is versioned with the scope, so a later re-import can't move it."""
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None
    scope = build_scope_version(expense.id, {"service_area": "Bay Area"}, db_session)

    create_listing_draft(expense, scope, PublishChoices(), db_session)

    assert scope.current_price_minor == expense.amount_minor_per_period
    assert scope.billing_cadence == expense.cadence


def test_unpublish_is_available_for_existing_listing(db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None
    scope = build_scope_version(expense.id, {"service_area": "Bay Area"}, db_session)
    listing = create_listing_draft(expense, scope, PublishChoices(), db_session)
    db_session.commit()
    db_session.refresh(listing)

    projection = unpublish_listing(listing.id, "acc_owner_1", db_session)

    stored_listing = db_session.get(PublicListingRecord, listing.id)
    assert projection.visibility == "private"
    assert stored_listing is not None
    assert stored_listing.visibility == "private"
