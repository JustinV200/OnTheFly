"""Exercises offer normalization, scope scoring, savings, and ranking."""

from datetime import datetime, timezone
import json

from app.models.challenge import Challenge
from app.models.listing import ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.comparison.normalize import is_scope_complete, normalize_to_monthly
from app.services.comparison.rank import rank_challenges
from app.services.comparison.savings import compute_savings
from app.core.money import Money



def _build_scope() -> ScopeVersion:
    return ScopeVersion(
        id="scope-1",
        expense_id="expense-1",
        version_number=1,
        service_area="San Francisco Bay Area",
        location_approximate="San Francisco, CA",
        square_footage=8000,
        visit_frequency="3x weekly",
        bathroom_count=4,
        required_tasks=json.dumps(["vacuum", "trash"]),
        supplies_included=True,
        equipment_included=True,
        taxes_included=True,
        insurance_required=None,
        start_date=None,
        minimum_term=None,
        cancellation_terms=None,
        current_price_minor=240000,
        current_price_currency="USD",
        billing_cadence="monthly",
        challenge_deadline=None,
        incumbent_vendor_name=None,
        created_at=datetime.now(timezone.utc),
    )



def test_normalize_to_monthly_handles_multiple_frequencies() -> None:
    weekly = Challenge(
        listing_id="listing-1",
        scope_version_id="scope-1",
        challenger_account_id="acc_challenger_1",
        bidding_mode_at_submission="open",
        price_minor=50000,
        price_currency="USD",
        billing_frequency="weekly",
        scope_included="[]",
        scope_excluded="[]",
        scope_extras="[]",
        setup_fee_minor=0,
        taxes_included=True,
        supplies_included=True,
        minimum_term=None,
        other_conditions=None,
        message_to_owner=None,
        availability=None,
        offer_expiry=None,
        site_visit_required=False,
        provenance="demo_data",
        submitted_at=datetime.now(timezone.utc),
        revised_at=None,
        is_active=True,
    )
    quarterly = Challenge(
        listing_id="listing-1",
        scope_version_id="scope-1",
        challenger_account_id="acc_challenger_2",
        bidding_mode_at_submission="open",
        price_minor=600000,
        price_currency="USD",
        billing_frequency="quarterly",
        scope_included="[]",
        scope_excluded="[]",
        scope_extras="[]",
        setup_fee_minor=0,
        taxes_included=True,
        supplies_included=True,
        minimum_term=None,
        other_conditions=None,
        message_to_owner=None,
        availability=None,
        offer_expiry=None,
        site_visit_required=False,
        provenance="demo_data",
        submitted_at=datetime.now(timezone.utc),
        revised_at=None,
        is_active=True,
    )

    assert normalize_to_monthly(weekly).monthly_price.amount == 216667
    assert normalize_to_monthly(quarterly).monthly_price.amount == 200000


def test_scope_gap_detects_two_visits_vs_three() -> None:
    scope = _build_scope()
    challenge = Challenge(
        listing_id="listing-1",
        scope_version_id="scope-1",
        challenger_account_id="acc_challenger_1",
        bidding_mode_at_submission="open",
        price_minor=187500,
        price_currency="USD",
        billing_frequency="monthly",
        scope_included=json.dumps(["vacuum", "trash", "2x weekly"]),
        scope_excluded=json.dumps([]),
        scope_extras=json.dumps([]),
        setup_fee_minor=0,
        taxes_included=True,
        supplies_included=True,
        minimum_term=None,
        other_conditions=None,
        message_to_owner=None,
        availability=None,
        offer_expiry=None,
        site_visit_required=False,
        provenance="demo_data",
        submitted_at=datetime.now(timezone.utc),
        revised_at=None,
        is_active=True,
    )

    result = is_scope_complete(challenge, scope)

    assert any(item.startswith("visit_frequency:") for item in result.missing_items)
    assert result.score < 1.0


def test_savings_are_provisional_when_setup_fee_unknown() -> None:
    savings = compute_savings(
        current_monthly=Money(amount=240000, currency="USD"),
        offer_monthly=Money(amount=187500, currency="USD"),
        setup_fee_minor=None,
    )

    assert savings.is_provisional is True
    assert savings.assumptions


def test_rank_challenges_includes_incumbent_baseline() -> None:
    scope = _build_scope()
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
        visibility="public",
        owner_corrected_vendor=None,
        owner_corrected_category=None,
    )
    challenge = Challenge(
        listing_id="listing-1",
        scope_version_id="scope-1",
        challenger_account_id="acc_challenger_1",
        bidding_mode_at_submission="open",
        price_minor=187500,
        price_currency="USD",
        billing_frequency="monthly",
        scope_included=json.dumps(["vacuum", "trash", "3x weekly", "equipment"]),
        scope_excluded=json.dumps([]),
        scope_extras=json.dumps([]),
        setup_fee_minor=0,
        taxes_included=True,
        supplies_included=True,
        minimum_term=None,
        other_conditions=None,
        message_to_owner=None,
        availability=None,
        offer_expiry=None,
        site_visit_required=False,
        provenance="demo_data",
        submitted_at=datetime.now(timezone.utc),
        revised_at=None,
        is_active=True,
    )

    ranked = rank_challenges([challenge], scope, expense)

    assert ranked[0].is_incumbent is True


def test_baseline_is_normalized_from_a_non_monthly_expense() -> None:
    """A quarterly expense's per-period amount is not a monthly price."""
    scope = _build_scope()
    scope.current_price_minor = None
    scope.billing_cadence = None
    expense = ServiceExpense(
        id="expense-1",
        cadence="quarterly",
        amount_minor_per_period=600000,
        currency="USD",
    )
    challenge = Challenge(
        id="challenge-1",
        challenger_account_id="acc_challenger_1",
        bidding_mode_at_submission="open",
        price_minor=150000,
        price_currency="USD",
        billing_frequency="monthly",
        scope_included=json.dumps(["vacuum", "trash", "3x weekly", "equipment"]),
        scope_excluded="[]",
        scope_extras="[]",
        setup_fee_minor=0,
        taxes_included=True,
        supplies_included=True,
        provenance="demo_data",
    )

    ranked = rank_challenges([challenge], scope, expense)

    assert ranked[0].normalized_price.amount == 200000
    assert ranked[1].savings is not None
    assert ranked[1].savings.annual_recurring_savings.amount == 600000
