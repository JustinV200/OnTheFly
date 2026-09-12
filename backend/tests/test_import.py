"""Exercises fixture-backed transaction ingestion and exclusion rules."""

from datetime import date

from sqlalchemy import func, select

from app.models.transaction import Transaction
from app.services.transactions.fixture.source import FixtureSource
from app.services.transactions.import_run import run_import


PROVIDER_ACCOUNT_ID = "fixture_apex_main"


def test_fixture_source_loads_expected_account_data() -> None:
    source = FixtureSource()
    transactions = source.list_transactions(
        provider_account_id=PROVIDER_ACCOUNT_ID,
        since=date(2025, 1, 1),
        until=date(2026, 12, 31),
    )

    assert len(transactions) >= 20
    assert all(transaction.provider_account_id == PROVIDER_ACCOUNT_ID for transaction in transactions)
    assert all(transaction.source_type == "fixture" for transaction in transactions)


def test_import_run_is_idempotent(db_session) -> None:
    first = run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    second = run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    total_count = db_session.scalar(select(func.count()).select_from(Transaction))

    assert first.new > 0
    assert second.duplicate == first.new
    assert second.new == 0
    assert total_count == first.new


def test_import_marks_payroll_transactions_as_excluded(db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)

    payroll = db_session.scalar(
        select(Transaction).where(Transaction.provider_transaction_id == "payroll-2026-08")
    )

    assert payroll is not None
    assert payroll.is_excluded is True
    assert payroll.excluded_reason == "payroll"
