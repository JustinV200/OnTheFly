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


def test_savings_name_scope_gaps_so_doing_less_is_not_shown_as_cheaper() -> None:
    savings = compute_savings(
        current_monthly=Money(amount=240000, currency="USD"),
        offer_monthly=Money(amount=180000, currency="USD"),
        setup_fee_minor=0,
        switching_cost_minor=0,
        cancellation_fee_minor=0,
        missing_scope_items=["task:vacuum", "task:trash"],
    )

    assert savings.is_provisional is True
    assert savings.label == "Potential savings (scope gaps)"
    assert savings.assumptions[0] == "offer does not cover requested scope: task:vacuum, task:trash"


def test_savings_with_full_scope_and_known_costs_are_not_provisional() -> None:
    savings = compute_savings(
        current_monthly=Money(amount=240000, currency="USD"),
        offer_monthly=Money(amount=187500, currency="USD"),
        setup_fee_minor=0,
        switching_cost_minor=0,
        cancellation_fee_minor=0,
    )

    assert savings.is_provisional is False
    assert savings.label == "Potential savings"


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

    ranked = rank_challenges([challenge], scope, expense, {scope.id: scope})

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
        scope_version_id="scope-1",
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

    ranked = rank_challenges([challenge], scope, expense, {scope.id: scope})

    assert ranked[1].savings.label == "Potential savings"
    assert ranked[0].normalized_price.amount == 200000
    assert ranked[1].savings is not None
    assert ranked[1].savings.annual_recurring_savings.amount == 600000


def test_ranked_offer_missing_required_tasks_carries_the_gap_into_savings() -> None:
    scope = _build_scope()
    expense = ServiceExpense(id="expense-1", cadence="monthly", amount_minor_per_period=240000, currency="USD")
    challenge = Challenge(
        id="challenge-1",
        scope_version_id="scope-1",
        challenger_account_id="acc_challenger_1",
        bidding_mode_at_submission="open",
        price_minor=180000,
        price_currency="USD",
        billing_frequency="monthly",
        scope_included="[]",
        scope_excluded="[]",
        scope_extras="[]",
        setup_fee_minor=0,
        taxes_included=True,
        supplies_included=True,
        provenance="challenger_submitted",
    )

    ranked = rank_challenges([challenge], scope, expense, {scope.id: scope})

    assert ranked[1].savings is not None
    assert ranked[1].savings.label == "Potential savings (scope gaps)"
    assert "task:vacuum" in ranked[1].savings.assumptions[0]


def test_an_offer_is_scored_against_the_scope_version_it_answered() -> None:
    """A newer scope version prices the incumbent row only; it never reframes an offer made on an older one."""
    answered = _build_scope()
    current = _build_scope()
    current.id = "scope-2"
    current.version_number = 2
    current.required_tasks = json.dumps(["vacuum", "trash", "windows"])
    current.current_price_minor = 210000
    expense = ServiceExpense(id="expense-1", cadence="monthly", amount_minor_per_period=240000, currency="USD")
    challenge = Challenge(
        id="challenge-1",
        scope_version_id="scope-1",
        challenger_account_id="acc_challenger_1",
        bidding_mode_at_submission="open",
        price_minor=200000,
        price_currency="USD",
        billing_frequency="monthly",
        scope_included=json.dumps(["vacuum", "trash", "3x weekly", "equipment"]),
        scope_excluded="[]",
        scope_extras="[]",
        setup_fee_minor=0,
        taxes_included=True,
        supplies_included=True,
        provenance="challenger_submitted",
    )

    incumbent, offer = rank_challenges([challenge], current, expense, {answered.id: answered, current.id: current})

    assert incumbent.normalized_price.amount == 210000
    assert offer.scope_completeness == 1.0
    assert offer.missing_items == []
    assert offer.baseline_monthly.amount == 240000
    assert offer.savings is not None
    assert offer.savings.annual_recurring_savings.amount == (240000 - 200000) * 12
    assert (offer.answered_scope_version_number, offer.is_current_scope_version) == (1, False)


def test_an_offer_in_another_currency_is_unranked_with_no_savings() -> None:
    scope = _build_scope()
    expense = ServiceExpense(id="expense-1", cadence="monthly", amount_minor_per_period=240000, currency="USD")
    challenge = Challenge(
        id="challenge-1",
        scope_version_id="scope-1",
        challenger_account_id="acc_challenger_1",
        bidding_mode_at_submission="open",
        price_minor=100,
        price_currency="usd",
        billing_frequency="monthly",
        scope_included="[]",
        scope_excluded="[]",
        scope_extras="[]",
        setup_fee_minor=0,
        provenance="challenger_submitted",
    )

    ranked = rank_challenges([challenge], scope, expense, {scope.id: scope})

    assert ranked[1].savings is None
    assert ranked[1].unranked_reason is not None
    assert "usd" in ranked[1].unranked_reason
