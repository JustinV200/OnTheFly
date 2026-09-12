"""Checks deterministic baseline and annualized spend calculations."""

from datetime import datetime, timezone

from app.models.transaction import Transaction
from app.services.expenses.baseline import BaselineBasis, compute_baseline
from app.services.expenses.recurrence import RecurrenceResult, detect_recurrence


def _transaction(
    index: int,
    amount_minor: int,
    month: int,
    day: int = 5,
    direction: str = "debit",
) -> Transaction:
    return Transaction(
        id=f"t-{index}",
        owner_account_id="acc_owner_1",
        provider="fixture",
        provider_account_id="fixture_apex_main",
        provider_transaction_id=f"clean-{index}",
        source_type="fixture",
        raw_description="SQ *SPARKLE CLEAN 4158881234 SF",
        normalized_vendor="Sparkle Clean",
        amount_minor=amount_minor,
        currency="USD",
        direction=direction,
        posted_at=datetime(2026, month, day, tzinfo=timezone.utc),
        status="posted",
        category="cleaning",
        memo=None,
        counterparty="Sparkle Clean",
        raw_payload="{}",
    )


def test_compute_baseline_annualizes_monthly_cost() -> None:
    transactions = [_transaction(index, 240000, index) for index in [1, 2, 3]]
    recurrence = RecurrenceResult(
        cadence="monthly",
        confidence=1.0,
        interval_regularity=1.0,
        amount_stability=1.0,
        first_seen=transactions[0].posted_at,
        last_seen=transactions[-1].posted_at,
        period_count=3,
    )

    baseline = compute_baseline(transactions, recurrence)

    assert baseline.amount_per_period.amount == 240000
    assert baseline.annualized_cost.amount == 2880000
    assert baseline.basis is BaselineBasis.current_price_level


def test_baseline_uses_the_current_price_after_a_confirmed_increase() -> None:
    amounts = [240000, 240000, 240000, 265000, 265000, 265000]
    transactions = [_transaction(index, amount, index + 1) for index, amount in enumerate(amounts)]

    baseline = compute_baseline(transactions, detect_recurrence(transactions))

    assert baseline.amount_per_period.amount == 265000
    assert baseline.supporting_transaction_ids == ["t-3", "t-4", "t-5"]
    assert baseline.basis_started_at == datetime(2026, 4, 5, tzinfo=timezone.utc)


def test_baseline_leaves_a_one_off_charge_out_of_the_price() -> None:
    amounts = [240000, 240000, 90000, 240000, 240000]
    transactions = [_transaction(index, amount, index + 1) for index, amount in enumerate(amounts)]

    baseline = compute_baseline(transactions, detect_recurrence(transactions))

    assert baseline.amount_per_period.amount == 240000
    assert "t-2" not in baseline.supporting_transaction_ids


def test_irregular_baseline_averages_charges_and_ignores_refund_credits() -> None:
    transactions = [
        _transaction(0, 5000, 1),
        _transaction(1, 15000, 6),
        _transaction(2, 5000, 7, direction="credit"),
    ]
    recurrence = RecurrenceResult(
        cadence="irregular",
        confidence=0.2,
        interval_regularity=0.0,
        amount_stability=0.3,
        first_seen=transactions[0].posted_at,
        last_seen=transactions[-1].posted_at,
        period_count=3,
    )

    baseline = compute_baseline(transactions, recurrence)

    # A refund is not a purchase at a price; counting it as one used to inflate the average.
    assert baseline.basis is BaselineBasis.average_of_charges
    assert baseline.amount_per_period.amount == 10000
    assert baseline.supporting_transaction_ids == ["t-0", "t-1"]
