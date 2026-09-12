"""Checks when Compound Eye price levels are trusted and when the baseline falls back to the labelled average."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models.transaction import Transaction
from app.services.expenses.baseline import BaselineBasis, compute_baseline
from app.services.expenses.recurrence import detect_recurrence
from app.services.expenses.signals import NotAssessedReason, analyze_price_levels

# A base price plus a deep clean every other month, in both orders and with an even or
# odd count. The second amount recurs, so none of its charges is a one-off.
ALTERNATING_SERIES = [
    [50000, 70000] * 3,
    [50000, 70000] * 3 + [50000],
    [70000, 50000] * 3,
    [70000, 50000] * 3 + [70000],
]


def _monthly_charges(amounts: list[int]) -> list[Transaction]:
    start = datetime(2026, 1, 5, tzinfo=timezone.utc)
    return [
        Transaction(
            id=f"t-{index}",
            owner_account_id="acc_owner_1",
            provider="fixture",
            provider_account_id="fixture_apex_main",
            provider_transaction_id=f"window-{index}",
            source_type="fixture",
            raw_description="BRIGHT WINDOW WASHING",
            normalized_vendor="Bright Window Washing",
            amount_minor=amount,
            currency="USD",
            direction="debit",
            posted_at=start + timedelta(days=30 * index),
            status="posted",
            category="cleaning",
            memo=None,
            counterparty="Bright Window Washing",
            raw_payload="{}",
        )
        for index, amount in enumerate(amounts)
    ]


@pytest.mark.parametrize("amounts", ALTERNATING_SERIES)
def test_alternating_amounts_have_no_price_level_and_no_one_offs(amounts: list[int]) -> None:
    analysis = analyze_price_levels(_monthly_charges(amounts), "monthly")

    assert analysis.is_assessed is False
    assert analysis.not_assessed_reason is NotAssessedReason.amounts_too_variable
    assert analysis.one_off_transaction_ids == []
    assert analysis.pending_change is None


@pytest.mark.parametrize("amounts", ALTERNATING_SERIES)
def test_alternating_amounts_baseline_is_the_average_of_every_charge(amounts: list[int]) -> None:
    transactions = _monthly_charges(amounts)

    baseline = compute_baseline(transactions, detect_recurrence(transactions))

    # Taking whichever amount came first as "the price" under- or overstated annual spend.
    assert baseline.basis is BaselineBasis.average_of_charges
    assert baseline.amount_per_period.amount == sum(amounts) // len(amounts)
    assert baseline.supporting_transaction_ids == [transaction.id for transaction in transactions]


def test_exactly_half_the_charges_in_a_level_is_not_a_stable_price() -> None:
    # Two unrelated outliers (no recurring cluster), leaving only 2 of 4 charges at a price.
    analysis = analyze_price_levels(_monthly_charges([50000, 90000, 50000, 70000]), "monthly")

    assert analysis.is_assessed is False
    assert analysis.not_assessed_reason is NotAssessedReason.amounts_too_variable


def test_distinct_one_off_charges_are_still_left_out_of_the_price() -> None:
    # Two flashes at different amounts don't recur, so each stays a one-off.
    amounts = [18500, 18500, 45000, 18500, 18500, 90000, 18500, 18500]

    analysis = analyze_price_levels(_monthly_charges(amounts), "monthly")

    assert analysis.is_assessed is True
    assert analysis.current_level_amount_minor == 18500
    assert analysis.one_off_transaction_ids == ["t-2", "t-5"]


def test_a_flash_at_the_price_a_later_step_confirms_is_still_a_step() -> None:
    # One early charge at the new price, then the price change itself. A single transient
    # is not a recurring cluster, so the confirmed step stands.
    analysis = analyze_price_levels(_monthly_charges([50000, 50000, 70000, 50000, 70000, 70000]), "monthly")

    assert analysis.is_assessed is True
    assert analysis.current_level_amount_minor == 70000
    assert analysis.one_off_transaction_ids == ["t-2"]
    assert [shift.transaction_id for shift in analysis.shifts] == ["t-4"]


@pytest.mark.parametrize("opening", [80000, 500000])
def test_a_lone_opening_charge_is_an_unestablished_earlier_price(opening: int) -> None:
    # A prorated first month or a setup fee, then $2,400 a month. One charge never formed
    # a price, so there is no confirmed change out of it, and it isn't called a one-off.
    transactions = _monthly_charges([opening, 240000, 240000, 240000])

    analysis = analyze_price_levels(transactions, "monthly")

    assert analysis.is_assessed is True
    assert analysis.shifts == []
    assert analysis.one_off_transaction_ids == []
    assert analysis.pending_change is None
    earlier = analysis.unconfirmed_earlier_price
    assert earlier is not None
    assert earlier.transaction_ids == ["t-0"]
    assert earlier.amount_minor == opening
    assert earlier.first_seen_at == transactions[0].posted_at

    # The baseline is the same as before: the current price, without the opening charge.
    baseline = compute_baseline(transactions, detect_recurrence(transactions))
    assert baseline.basis is BaselineBasis.current_price_level
    assert baseline.amount_per_period.amount == 240000
    assert baseline.supporting_transaction_ids == ["t-1", "t-2", "t-3"]
    assert baseline.basis_started_at == transactions[1].posted_at


def test_an_opening_price_held_by_two_charges_is_still_a_confirmed_change() -> None:
    analysis = analyze_price_levels(_monthly_charges([18500, 18500, 20500, 20500]), "monthly")

    assert analysis.unconfirmed_earlier_price is None
    assert [(shift.previous_amount_minor, shift.new_amount_minor) for shift in analysis.shifts] == [(18500, 20500)]


def test_a_later_change_is_measured_from_the_first_established_price() -> None:
    analysis = analyze_price_levels(_monthly_charges([80000, 240000, 240000, 300000, 300000]), "monthly")

    assert analysis.unconfirmed_earlier_price is not None
    assert analysis.unconfirmed_earlier_price.transaction_ids == ["t-0"]
    assert [(shift.previous_amount_minor, shift.new_amount_minor) for shift in analysis.shifts] == [(240000, 300000)]
    assert analysis.current_level_transaction_ids == ["t-3", "t-4"]


def test_an_opening_amount_that_comes_back_is_a_second_price() -> None:
    # The opening $800 recurs later as a flash, so like any recurring off-level amount it
    # is a second price and there is no single current price to report.
    analysis = analyze_price_levels(_monthly_charges([80000, 240000, 240000, 80000, 240000, 240000]), "monthly")

    assert analysis.is_assessed is False
    assert analysis.not_assessed_reason is NotAssessedReason.amounts_too_variable
