"""Shared setup for outreach tests: a published cleaning listing with private details that must never leak,
plus small API helpers for the discover -> preview -> approve flow.
"""

from datetime import datetime, timedelta, timezone
import json

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.listing import PublicListingRecord
from app.models.outreach import Invitation, InvitationApproval, SandboxOutboxMessage
from app.models.service_expense import ServiceExpense
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing
from app.services.transactions.import_run import run_import

OWNER_ID = "acc_owner_1"
OWNER_HEADERS = {"X-Account-ID": OWNER_ID}
INCUMBENT_NAME = "Sparkle Clean"
# Scope fields the public projection does not carry; none may appear in an invitation.
PRIVATE_CANCELLATION_TERMS = "30 days written notice to 1200 Market Street Suite 400"
PRIVATE_INSURANCE = "$2M general liability"
PRIVATE_MINIMUM_TERM = "18 month minimum"


def publish_cleaning_listing(
    db: Session,
    show_incumbent_vendor: bool = False,
    bidding_mode: str = "sealed",
) -> PublicListingRecord:
    """Import the owner's fixture spend and publish its cleaning expense with a full scope."""

    run_import(OWNER_ID, "fixture_apex_main", db)
    expense = db.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == INCUMBENT_NAME))
    assert expense is not None
    scope = build_scope_version(
        expense.id,
        {
            "service_area": "San Francisco Bay Area",
            "location_approximate": "San Francisco, CA",
            "square_footage": 8000,
            "visit_frequency": "3x weekly",
            "bathroom_count": 4,
            "required_tasks": json.dumps(["vacuum", "trash", "restrooms"]),
            "insurance_required": PRIVATE_INSURANCE,
            "minimum_term": PRIVATE_MINIMUM_TERM,
            "cancellation_terms": PRIVATE_CANCELLATION_TERMS,
            "current_price_minor": 240000,
            "billing_cadence": "monthly",
            "challenge_deadline": datetime.now(timezone.utc) + timedelta(days=14),
            "incumbent_vendor_name": INCUMBENT_NAME,
        },
        db,
    )
    choices = PublishChoices(bidding_mode=bidding_mode, show_incumbent_vendor=show_incumbent_vendor)
    listing = create_listing_draft(expense, scope, choices, db)
    db.commit()
    db.refresh(listing)
    preview = build_public_listing(listing, expense, scope, choices)
    publish_listing(
        expense_id=expense.id,
        scope_version_id=scope.id,
        choices=choices,
        previewed_payload_hash=build_payload_hash(preview),
        acting_account_id=OWNER_ID,
        db=db,
    )
    refreshed = db.get(PublicListingRecord, listing.id)
    assert refreshed is not None
    return refreshed


def discover(client: TestClient, listing_id: str) -> dict:
    """Run fixture discovery through the API and return the run."""

    response = client.post(f"/api/invitations/listings/{listing_id}/discover", headers=OWNER_HEADERS)
    assert response.status_code == 200, response.text
    return response.json()


def candidates_by_name(client: TestClient, listing_id: str) -> dict[str, dict]:
    """Return the overview's candidates keyed by business name."""

    response = client.get(f"/api/invitations/listings/{listing_id}", headers=OWNER_HEADERS)
    assert response.status_code == 200, response.text
    return {candidate["business_name"]: candidate for candidate in response.json()["candidates"]}


def preview(client: TestClient, listing_id: str, candidate_ids: list[str]) -> dict:
    """Preview a batch through the API and return the preview."""

    response = client.post(
        f"/api/invitations/listings/{listing_id}/preview",
        headers=OWNER_HEADERS,
        json={"candidate_ids": candidate_ids},
    )
    assert response.status_code == 200, response.text
    return response.json()


def approve(client: TestClient, listing_id: str, candidate_ids: list[str], message_hash: str):
    """Approve a batch through the API and return the raw response."""

    return client.post(
        f"/api/invitations/listings/{listing_id}/approve",
        headers=OWNER_HEADERS,
        json={"candidate_ids": candidate_ids, "previewed_message_hash": message_hash},
    )


def outreach_row_counts(db: Session) -> tuple[int, int, int]:
    """Return (approvals, invitations, sandbox outbox messages) straight from the database."""

    return (
        int(db.scalar(select(func.count()).select_from(InvitationApproval)) or 0),
        int(db.scalar(select(func.count()).select_from(Invitation)) or 0),
        int(db.scalar(select(func.count()).select_from(SandboxOutboxMessage)) or 0),
    )


def smtp_settings(**overrides: object) -> Settings:
    """Settings for a compliant smtp channel that allowlists Bay Clean only; no .env is read."""

    values: dict[str, object] = {
        "outreach_channel": "smtp",
        "outreach_from_email": "invitations@onthefly.test",
        "outreach_postal_address": "On the Fly Demo, 100 Example Way, Springfield, USA",
        "smtp_host": "smtp.test",
        "smtp_use_starttls": False,
        "outreach_recipient_allowlist": "bids@bayclean.example",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)
