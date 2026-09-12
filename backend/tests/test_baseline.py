"""Checks deterministic baseline and annualized spend calculations."""

from datetime import datetime, timezone

from app.models.transaction import Transaction
from app.services.expenses.baseline import compute_baseline
from app.services.expenses.recurrence import RecurrenceResult



def test_compute_baseline_annualizes_monthly_cost() -> None:
    transactions = [
        Transaction(
            id=f"t-{index}",
            owner_account_id="acc_owner_1",
            provider="fixture",
            provider_account_id="fixture_apex_main",
            provider_transaction_id=f"clean-{index}",
            source_type="fixture",
            raw_description="SQ *SPARKLE CLEAN 4158881234 SF",
            normalized_vendor="Sparkle Clean",
            amount_minor=240000,
            currency="USD",
            direction="debit",
            posted_at=datetime(2026, index, 5, tzinfo=timezone.utc),
            status="posted",
            category="cleaning",
            memo=None,
            counterparty="Sparkle Clean",
            raw_payload="{}",
        )
        for index in [1, 2, 3]
    ]
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
