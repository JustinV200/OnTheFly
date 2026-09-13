"""Checks that spend signals read the same Stripe charges as the stored baseline.
Pending, void, and credit rows stay stored for audit but are never scored or used for a price.
"""

from datetime import datetime, timezone

from sqlalchemy import select

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.sync import sync_service_expenses

OWNER_ID = "acc_owner_2"
OWNER_HEADERS = {"X-Account-ID": OWNER_ID}
VENDOR_KEY = "Sparkle Clean [USD]"


def _stripe_row(index: int, amount_minor: int, month: int, status: str, direction: str = "debit") -> Transaction:
    return Transaction(
        id=f"stripe-{index}",
        owner_account_id=OWNER_ID,
        provider="stripe",
        provider_account_id="fca_test_account",
        provider_transaction_id=f"fctxn_{index}",
        source_type="sandbox",
        raw_description="SPARKLE CLEAN",
        normalized_vendor=None,
        amount_minor=amount_minor,
        currency="USD",
        direction=direction,
        posted_at=datetime(2026, month, 5, tzinfo=timezone.utc),
        status=status,
        category=None,
        memo=None,
        counterparty=None,
        raw_payload="{}",
        # Mirrors run_import: a non-posted Stripe row is stored but marked with its status.
        is_excluded=status != "posted",
        excluded_reason=None if status == "posted" else status,
    )


def _stored_expense(db_session) -> ServiceExpense:
    expense = db_session.scalar(
        select(ServiceExpense).where(
            ServiceExpense.owner_account_id == OWNER_ID,
            ServiceExpense.normalized_vendor == VENDOR_KEY,
        )
    )
    assert expense is not None
    return expense


def test_void_and_pending_rows_do_not_move_the_signals_baseline(client, db_session) -> None:
    posted = [_stripe_row(month, 240000, month, "posted") for month in (1, 2, 3, 4)]
    refund = _stripe_row(10, 50000, 3, "posted", direction="credit")
    # A price rise Stripe voided, then one still pending: neither is a charge the owner paid.
    unsettled = [
        _stripe_row(5, 260000, 5, "void"),
        _stripe_row(6, 260000, 6, "void"),
        _stripe_row(7, 260000, 7, "pending"),
    ]
    db_session.add_all([*posted, refund, *unsettled])
    db_session.commit()
    sync_service_expenses(OWNER_ID, db_session)
    expense = _stored_expense(db_session)

    response = client.get(f"/api/spend-signals/{expense.id}", headers=OWNER_HEADERS)

    assert response.status_code == 200
    report = response.json()
    assert expense.amount_minor_per_period == 240000
    assert report["baseline"]["amount_minor"] == expense.amount_minor_per_period
    assert set(report["baseline"]["supporting_transaction_ids"]) == {row.id for row in posted}
    assert report["price_levels"]["shifts"] == []
    assert report["price_levels"]["pending_change"] is None
    assert {charge["transaction_id"] for charge in report["charges"]} == {row.id for row in posted}
    assert report["unusual_charge_count"] == 0
    left_out = {(row["transaction_id"], row["status"], row["direction"]) for row in report["not_analyzed_transactions"]}
    assert left_out == {
        ("stripe-10", "posted", "credit"),
        ("stripe-5", "void", "debit"),
        ("stripe-6", "void", "debit"),
        ("stripe-7", "pending", "debit"),
    }


def test_all_void_charges_list_both_circuits_as_not_run(client, db_session) -> None:
    rows = [_stripe_row(month, 150000, month, "posted") for month in (1, 2, 3, 4)]
    db_session.add_all(rows)
    db_session.commit()
    sync_service_expenses(OWNER_ID, db_session)
    # Stripe later reports every charge void; sync zeroes the stored baseline.
    for row in rows:
        row.status = "void"
    db_session.commit()
    sync_service_expenses(OWNER_ID, db_session)
    expense = _stored_expense(db_session)

    response = client.get(f"/api/spend-signals/{expense.id}", headers=OWNER_HEADERS)

    assert response.status_code == 200
    report = response.json()
    assert expense.eligibility_reason == "no_posted_debits"
    assert expense.amount_minor_per_period == 0
    assert report["baseline"] is None
    assert report["price_levels"]["is_assessed"] is False
    assert report["price_levels"]["not_assessed_reason"] == "no_posted_charges"
    assert report["charges"] == []
    assert report["unusual_charge_count"] == 0
    assert {row["transaction_id"] for row in report["not_analyzed_transactions"]} == {row.id for row in rows}
    roles = {entry["component"]: entry["role"] for entry in report["fly_brain"]}
    assert set(roles) == {"compound_eye", "mushroom_body_novelty"}
    assert all(role.startswith("Not run: no posted charges") for role in roles.values())
