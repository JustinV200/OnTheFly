"""Checks the marketplace category filter and the projection's missing-category key agree.

Uncategorized expenses (every Stripe import) used to publish as 'commercial_cleaning'
while the filter asked for 'cleaning', so those listings vanished under the filter.
"""

from datetime import datetime, timezone

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.listings.projection import build_public_listing
from app.services.listings.types import PublishChoices


def _public_listing(db_session, owner_account_id: str, category: str) -> PublicListingRecord:
    expense = ServiceExpense(
        owner_account_id=owner_account_id,
        normalized_vendor=f"Vendor for {category}",
        category=None,
        cadence="monthly",
        recurrence_confidence=1.0,
        amount_minor_per_period=240000,
        currency="USD",
        annualized_amount_minor=2880000,
        first_seen=datetime(2026, 1, 1, tzinfo=timezone.utc),
        last_seen=datetime(2026, 6, 1, tzinfo=timezone.utc),
        period_count=6,
        is_eligible=True,
        eligibility_reason="eligible",
        is_publishable=True,
        visibility="public",
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
        category=category,
        scope_summary="San Francisco, CA · 8000 sq ft · 3x weekly",
        price_minor=240000,
        price_currency="USD",
        billing_cadence="monthly",
        service_area_approximate="San Francisco Bay Area",
        bidding_mode="sealed",
        visibility="public",
        published_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )
    db_session.add(record)
    db_session.commit()
    return record


def _feed_ids(client, category: str) -> list[str]:
    response = client.get(
        f"/api/marketplace?category={category}",
        headers={"X-Account-ID": "acc_challenger_1"},
    )
    assert response.status_code == 200
    return [item["listing"]["id"] for item in response.json()["listings"]]


def test_listing_stored_as_commercial_cleaning_appears_under_cleaning(client, db_session) -> None:
    legacy = _public_listing(db_session, "acc_owner_1", "commercial_cleaning")
    current = _public_listing(db_session, "acc_challenger_2", "cleaning")
    landscaping = _public_listing(db_session, "acc_challenger_3", "landscaping")

    cleaning_ids = _feed_ids(client, "cleaning")
    long_key_ids = _feed_ids(client, "commercial_cleaning")

    assert sorted(cleaning_ids) == sorted([legacy.id, current.id])
    assert sorted(long_key_ids) == sorted([legacy.id, current.id])
    assert _feed_ids(client, "landscaping") == [landscaping.id]


def test_uncategorized_expense_projects_the_key_the_filter_uses() -> None:
    expense = ServiceExpense(id="expense-1", category=None, cadence="monthly", amount_minor_per_period=240000, currency="USD")
    listing = PublicListingRecord(
        id="listing-1",
        expense_id="expense-1",
        owner_account_id="acc_owner_1",
        visibility="scope_confirmed",
    )
    scope = ScopeVersion(id="scope-1", expense_id="expense-1", version_number=1, current_price_currency="USD")

    projection = build_public_listing(listing, expense, scope, PublishChoices())

    assert projection.category == "cleaning"
