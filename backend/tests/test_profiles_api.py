"""Verifies public profile access and public-only listing serialization."""

from sqlalchemy import select

from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing
from app.services.transactions.import_run import run_import


PROVIDER_ACCOUNT_ID = "fixture_apex_main"


def test_profile_endpoint_is_public_and_excludes_private_listings(client, db_session) -> None:
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
    listing = create_listing_draft(expense, scope, PublishChoices(), db_session)
    db_session.commit()
    db_session.refresh(listing)

    draft_response = client.get(f"/api/profiles/apex-facilities")
    draft_payload = draft_response.json()
    preview = build_public_listing(listing, expense, scope, PublishChoices())
    publish_listing(
        expense_id=expense.id,
        scope_version_id=scope.id,
        choices=PublishChoices(),
        previewed_payload_hash=build_payload_hash(preview),
        acting_account_id="acc_owner_1",
        db=db_session,
    )

    response = client.get("/api/profiles/apex-facilities")

    assert draft_response.status_code == 200
    assert draft_payload["listings"] == []
    assert response.status_code == 200
    assert response.json()["listings"]
    assert "owner_account_id" not in response.json()["listings"][0]
