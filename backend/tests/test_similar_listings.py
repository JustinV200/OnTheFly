"""Exercises FlyHash similar-listing retrieval and its public-only guarantees."""

from datetime import datetime, timezone
import uuid

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense


def _listing(
    db_session,
    owner_account_id: str,
    scope_summary: str,
    price_minor: int = 240000,
    visibility: str = "public",
) -> PublicListingRecord:
    expense = ServiceExpense(
        owner_account_id=owner_account_id,
        normalized_vendor=f"Vendor {uuid.uuid4()}",
        category="cleaning",
        cadence="monthly",
        recurrence_confidence=1.0,
        amount_minor_per_period=price_minor,
        currency="USD",
        annualized_amount_minor=price_minor * 12,
        first_seen=datetime(2026, 1, 1, tzinfo=timezone.utc),
        last_seen=datetime(2026, 6, 1, tzinfo=timezone.utc),
        period_count=6,
        is_eligible=True,
        eligibility_reason="eligible",
        is_publishable=True,
        visibility=visibility,
    )
    db_session.add(expense)
    db_session.flush()
    scope = ScopeVersion(expense_id=expense.id, version_number=1)
    db_session.add(scope)
    db_session.flush()
    record = PublicListingRecord(
        expense_id=expense.id,
        scope_version_id=scope.id,
        owner_account_id=owner_account_id,
        category="cleaning",
        scope_summary=scope_summary,
        price_minor=price_minor,
        price_currency="USD",
        billing_cadence="monthly",
        service_area_approximate="San Francisco Bay Area",
        bidding_mode="sealed",
        visibility=visibility,
        published_at=datetime(2026, 6, 1, tzinfo=timezone.utc) if visibility == "public" else None,
    )
    db_session.add(record)
    db_session.commit()
    return record


OFFICE_SCOPE = "San Francisco, CA · 8000 sq ft · 3x weekly · vacuum, trash, restrooms"


def test_similar_scope_is_found_and_unrelated_scope_is_not(client, db_session) -> None:
    anchor = _listing(db_session, "acc_owner_1", OFFICE_SCOPE)
    close = _listing(db_session, "acc_challenger_2", "Oakland, CA · 7500 sq ft · 3x weekly · vacuum, trash, restrooms")
    unrelated = _listing(db_session, "acc_challenger_3", "Location not specified · 900 sq ft · 1x weekly · windows")

    response = client.get(f"/api/marketplace/{anchor.id}/similar")

    assert response.status_code == 200
    payload = response.json()
    ids = [item["listing"]["id"] for item in payload["listings"]]
    assert ids == [close.id]
    assert unrelated.id not in ids
    assert "3x weekly" in payload["listings"][0]["shared_terms"]
    assert "vacuum" in payload["listings"][0]["shared_terms"]
    assert payload["fly_brain"][0]["component"] == "mushroom_body_flyhash"


def test_price_is_not_used_to_decide_similarity(client, db_session) -> None:
    anchor = _listing(db_session, "acc_owner_1", OFFICE_SCOPE, price_minor=240000)
    cheaper_same_scope = _listing(db_session, "acc_challenger_2", OFFICE_SCOPE, price_minor=120000)

    payload = client.get(f"/api/marketplace/{anchor.id}/similar").json()

    assert payload["listings"][0]["listing"]["id"] == cheaper_same_scope.id
    assert payload["listings"][0]["scope_similarity"] == 1.0


def test_private_listings_never_surface_and_are_never_an_anchor(client, db_session) -> None:
    anchor = _listing(db_session, "acc_owner_1", OFFICE_SCOPE)
    private = _listing(db_session, "acc_challenger_2", OFFICE_SCOPE, visibility="private")
    draft = _listing(db_session, "acc_challenger_3", OFFICE_SCOPE, visibility="scope_confirmed")

    payload = client.get(f"/api/marketplace/{anchor.id}/similar").json()

    assert payload["listings"] == []
    assert payload["message"]
    assert client.get(f"/api/marketplace/{private.id}/similar").status_code == 404
    assert client.get(f"/api/marketplace/{draft.id}/similar").status_code == 404


def test_viewer_own_listings_are_left_out(client, db_session) -> None:
    anchor = _listing(db_session, "acc_owner_1", OFFICE_SCOPE)
    viewer_listing = _listing(db_session, "acc_challenger_2", OFFICE_SCOPE)
    other_listing = _listing(db_session, "acc_challenger_3", OFFICE_SCOPE)

    payload = client.get(
        f"/api/marketplace/{anchor.id}/similar",
        headers={"X-Account-ID": "acc_challenger_2"},
    ).json()

    ids = [item["listing"]["id"] for item in payload["listings"]]
    assert other_listing.id in ids
    assert viewer_listing.id not in ids
