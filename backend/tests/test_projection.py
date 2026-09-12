"""Verifies additive public projections do not leak new private fields."""

from datetime import datetime, timezone

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.listings.projection import build_public_listing
from app.services.listings.types import PublishChoices



def test_public_projection_is_explicit_and_does_not_leak_private_fields() -> None:
    expense = ServiceExpense(
        id="expense-1",
        owner_account_id="acc_owner_1",
        normalized_vendor="Sparkle Clean",
        category="cleaning",
        cadence="monthly",
        recurrence_confidence=1.0,
        amount_minor_per_period=240000,
        currency="USD",
        annualized_amount_minor=2880000,
        first_seen=datetime.now(timezone.utc),
        last_seen=datetime.now(timezone.utc),
        period_count=12,
        is_eligible=True,
        eligibility_reason="eligible",
        is_publishable=True,
        visibility="scope_confirmed",
        owner_corrected_vendor=None,
        owner_corrected_category=None,
    )
    setattr(expense, "secret_notes", "should never leak")
    listing = PublicListingRecord(
        id="listing-1",
        expense_id="expense-1",
        scope_version_id="scope-1",
        owner_account_id="acc_owner_1",
        category="cleaning",
        scope_summary="",
        price_minor=240000,
        price_currency="USD",
        billing_cadence="monthly",
        service_area_approximate="San Francisco",
        bidding_mode="sealed",
        challenge_deadline=None,
        show_incumbent_vendor=False,
        incumbent_vendor_name=None,
        show_exact_address=False,
        visibility="scope_confirmed",
        created_at=datetime.now(timezone.utc),
        published_at=None,
    )
    scope = ScopeVersion(
        id="scope-1",
        expense_id="expense-1",
        version_number=1,
        service_area="San Francisco Bay Area",
        location_approximate="San Francisco, CA",
        square_footage=8000,
        visit_frequency="3x weekly",
        bathroom_count=4,
        required_tasks='["vacuum", "trash"]',
        supplies_included=True,
        equipment_included=True,
        taxes_included=True,
        insurance_required="General liability",
        start_date=None,
        minimum_term=None,
        cancellation_terms=None,
        current_price_minor=240000,
        current_price_currency="USD",
        billing_cadence="monthly",
        challenge_deadline=None,
        incumbent_vendor_name="Sparkle Clean",
        created_at=datetime.now(timezone.utc),
    )

    projection = build_public_listing(listing, expense, scope, PublishChoices())

    assert "secret_notes" not in projection.model_dump()
    assert projection.category == "cleaning"


def test_public_price_and_cadence_come_from_the_same_source() -> None:
    """A quarterly amount must never be published under a scope's monthly cadence."""
    expense = ServiceExpense(
        id="expense-1",
        owner_account_id="acc_owner_1",
        normalized_vendor="Window Co",
        category="cleaning",
        cadence="quarterly",
        recurrence_confidence=1.0,
        amount_minor_per_period=600000,
        currency="USD",
        annualized_amount_minor=2400000,
        first_seen=datetime.now(timezone.utc),
        last_seen=datetime.now(timezone.utc),
        period_count=4,
        is_eligible=True,
        eligibility_reason="eligible",
        is_publishable=True,
        visibility="scope_confirmed",
    )
    listing = PublicListingRecord(
        id="listing-1",
        expense_id="expense-1",
        owner_account_id="acc_owner_1",
        visibility="scope_confirmed",
    )
    # The owner typed a cadence but no price, so the pair falls back to the transactions whole.
    scope = ScopeVersion(
        id="scope-1",
        expense_id="expense-1",
        version_number=1,
        billing_cadence="monthly",
        current_price_minor=None,
        current_price_currency="USD",
    )

    projection = build_public_listing(listing, expense, scope, PublishChoices())

    assert projection.price_minor == 600000
    assert projection.billing_cadence == "quarterly"
