"""Verifies the public listing carries the scored scope requirements a challenger must match.
The challenge form's "full requested scope" action copies these fields, so an honest offer scores complete.
"""

import json
import re

from sqlalchemy import select

from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.comparison.normalize import is_scope_complete
from app.services.listings.projection import build_public_listing
from app.services.listings.types import PublishChoices
from app.services.transactions.import_run import run_import

OWNER = {"X-Account-ID": "acc_owner_1"}
CHALLENGER = {"X-Account-ID": "acc_challenger_1"}
# Mirrors the visits pattern in frontend/src/features/challenge/requestedScope.ts.
VISITS_RE = re.compile(r"(\d+)\s*(?:x|×|times)\s*(?:/\s*|a\s+|per\s+)?week(?:ly)?", re.IGNORECASE)


def _owner_scope(**overrides: object) -> dict[str, object]:
    scope: dict[str, object] = {
        "location_approximate": "San Francisco, CA",
        "square_footage": 8000,
        "visit_frequency": "3 times per week",
        # Padding and a blank entry are cleaned at the API boundary, so neither reaches the public payload.
        "required_tasks": ["Vacuum", "trash", "restrooms", " windows ", "  "],
        "supplies_included": False,
        "equipment_included": True,
        "taxes_included": None,
        "current_price_minor": 240000,
        "billing_cadence": "monthly",
    }
    scope.update(overrides)
    return scope


def _draft(client, db_session, scope: dict[str, object], bidding_mode: str = "open") -> str:
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None
    body = {"expense_id": expense.id, "scope": scope, "choices": {"bidding_mode": bidding_mode}}
    response = client.post("/api/listings", headers=OWNER, json=body)
    assert response.status_code == 200, response.text
    return response.json()["listing_id"]


def _full_scope_button_payload(listing: dict[str, object]) -> dict[str, object]:
    """Build the payload the challenge form sends after "Offer the full requested scope"."""

    included = list(listing["required_tasks"])
    excluded: list[str] = []
    visits = VISITS_RE.search(listing["visit_frequency"] or "")
    if visits:
        included.append(f"{visits.group(1)}x weekly")
    if listing["equipment_included"] is True:
        included.append("equipment")
    elif listing["equipment_included"] is False:
        excluded.append("equipment")
    return {
        "acknowledged_bidding_mode": listing["bidding_mode"],
        "price_minor": 200000,
        "billing_frequency": "monthly",
        "scope_included": included,
        "scope_excluded": excluded,
        "supplies_included": listing["supplies_included"],
        "taxes_included": listing["taxes_included"],
    }


def test_projection_builds_scope_requirements_from_the_confirmed_scope() -> None:
    expense = ServiceExpense(id="expense-1", category="cleaning", cadence="monthly", amount_minor_per_period=240000, currency="USD")
    listing = PublicListingRecord(id="listing-1", expense_id="expense-1", owner_account_id="acc_owner_1", visibility="scope_confirmed")
    scope = ScopeVersion(
        id="scope-1",
        expense_id="expense-1",
        version_number=1,
        visit_frequency="3x weekly",
        required_tasks=json.dumps(["vacuum", "windows"]),
        supplies_included=False,
        equipment_included=None,
        taxes_included=True,
        current_price_currency="USD",
    )

    projection = build_public_listing(listing, expense, scope, PublishChoices())

    assert projection.required_tasks == ["vacuum", "windows"]
    assert projection.visit_frequency == "3x weekly"
    assert projection.supplies_included is False
    assert projection.equipment_included is None
    assert projection.taxes_included is True


def test_served_listing_carries_exactly_the_previewed_requirements(client, db_session) -> None:
    run_import("acc_owner_1", "fixture_apex_main", db_session)
    listing_id = _draft(client, db_session, _owner_scope())
    preview = client.get(f"/api/listings/{listing_id}/preview", headers=OWNER).json()

    published = client.post(f"/api/listings/{listing_id}/publish", headers=OWNER, json={"previewed_payload_hash": preview["payload_hash"]})
    served = client.get(f"/api/marketplace/{listing_id}").json()["listing"]

    assert published.status_code == 200
    fields = ["required_tasks", "visit_frequency", "supplies_included", "equipment_included", "taxes_included"]
    assert {field: preview["projection"][field] for field in fields} == {
        "required_tasks": ["Vacuum", "trash", "restrooms", "windows"],
        "visit_frequency": "3 times per week",
        "supplies_included": False,
        "equipment_included": True,
        "taxes_included": None,
    }
    assert {field: served[field] for field in fields} == {field: preview["projection"][field] for field in fields}


def test_preview_hash_covers_scope_requirements(client, db_session) -> None:
    """Changing only an expectation after preview must invalidate the owner's confirmation."""
    run_import("acc_owner_1", "fixture_apex_main", db_session)
    listing_id = _draft(client, db_session, _owner_scope(supplies_included=True))
    stale_hash = client.get(f"/api/listings/{listing_id}/preview", headers=OWNER).json()["payload_hash"]

    _draft(client, db_session, _owner_scope(supplies_included=False))
    fresh_hash = client.get(f"/api/listings/{listing_id}/preview", headers=OWNER).json()["payload_hash"]
    rejected = client.post(f"/api/listings/{listing_id}/publish", headers=OWNER, json={"previewed_payload_hash": stale_hash})

    assert fresh_hash != stale_hash
    assert rejected.status_code == 400


def test_full_requested_scope_offer_scores_complete(client, db_session) -> None:
    run_import("acc_owner_1", "fixture_apex_main", db_session)
    listing_id = _draft(client, db_session, _owner_scope(taxes_included=True))
    preview_hash = client.get(f"/api/listings/{listing_id}/preview", headers=OWNER).json()["payload_hash"]
    client.post(f"/api/listings/{listing_id}/publish", headers=OWNER, json={"previewed_payload_hash": preview_hash})
    listing = client.get(f"/api/marketplace/{listing_id}").json()["listing"]

    submitted = client.post(f"/api/listings/{listing_id}/challenges", headers=CHALLENGER, json=_full_scope_button_payload(listing))
    board = client.get(f"/api/listings/{listing_id}/leaderboard").json()
    inbox = client.get(f"/api/listings/{listing_id}/inbox", headers=OWNER).json()

    assert submitted.status_code == 200, submitted.text
    assert [entry["scope_completeness"] for entry in board["entries"]] == [1.0]
    assert inbox["challenges"][0]["missing_items"] == []
    assert inbox["challenges"][0]["savings"]["label"] == "Potential savings"


def test_required_tasks_match_regardless_of_case_and_spacing() -> None:
    scope = ScopeVersion(required_tasks=json.dumps(["Vacuum ", "Restrooms"]))
    challenge = Challenge(
        scope_included=json.dumps(["vacuum", " restrooms"]),
        scope_excluded="[]",
        scope_extras="[]",
        supplies_included=None,
        taxes_included=None,
    )

    result = is_scope_complete(challenge, scope)

    assert result.missing_items == []
    assert result.breakdown["required_tasks"] == 1.0
