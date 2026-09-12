"""Verifies deterministic cadence detection for grouped transactions."""

from datetime import datetime, timezone

from app.models.transaction import Transaction
from app.services.expenses.recurrence import detect_recurrence



def test_detect_recurrence_finds_monthly_pattern() -> None:
    transactions = [
        Transaction(
            owner_account_id="acc_owner_1",
            provider="fixture",
            provider_account_id="fixture_apex_main",
            provider_transaction_id=f"t-{index}",
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

    result = detect_recurrence(transactions)

    assert result.cadence == "monthly"
    assert result.confidence > 0.9


def test_detect_recurrence_finds_every_two_months_as_bimonthly() -> None:
    transactions = [
        Transaction(
            owner_account_id="acc_owner_1",
            provider="fixture",
            provider_account_id="fixture_apex_main",
            provider_transaction_id=f"land-{month}",
            source_type="fixture",
            raw_description="GREEN THUMB LANDSCAPING",
            normalized_vendor="Green Thumb Landscaping",
            amount_minor=95000,
            currency="USD",
            direction="debit",
            posted_at=datetime(2026, month, 28, tzinfo=timezone.utc),
            status="posted",
            category="landscaping",
            memo=None,
            counterparty="Green Thumb Landscaping",
            raw_payload="{}",
        )
        for month in [2, 4, 6, 8]
    ]

    result = detect_recurrence(transactions)

    # Previously "quarterly", which annualized this spend x4 instead of x6.
    assert result.cadence == "bimonthly"


def test_detect_recurrence_requires_three_payments() -> None:
    transactions = [
        Transaction(
            owner_account_id="acc_owner_1",
            provider="fixture",
            provider_account_id="fixture_apex_main",
            provider_transaction_id=f"t-{index}",
            source_type="fixture",
            raw_description="ORKIN PEST CONTROL",
            normalized_vendor="Orkin Pest Control",
            amount_minor=18500,
            currency="USD",
            direction="debit",
            posted_at=datetime(2026, index, 12, tzinfo=timezone.utc),
            status="posted",
            category="pest_control",
            memo=None,
            counterparty="Orkin Pest Control",
            raw_payload="{}",
        )
        for index in [1, 2]
    ]

    result = detect_recurrence(transactions)

    assert result.cadence == "insufficient_data"
