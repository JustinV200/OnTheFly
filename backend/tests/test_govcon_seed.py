"""Verify synthetic GovCon data uses the existing private expense pipeline."""
from app.cli.seed_govcon_demo import OWNER_ID, seed_govcon_demo
from app.models import Account, FinancialConnection, ServiceExpense, Transaction
from sqlalchemy import func, select
from sqlalchemy.orm import Session


def test_seed_generates_five_monthly_expenses_and_is_idempotent(db_session: Session) -> None:
    first = seed_govcon_demo(db_session)
    second = seed_govcon_demo(db_session)
    assert first["import"]["new"] == 30
    assert second["import"]["new"] == 0
    assert second["import"]["duplicate"] == 30
    assert first["annualized_total_minor"] == 404400000
    expenses = db_session.scalars(select(ServiceExpense).where(
        ServiceExpense.owner_account_id == OWNER_ID)).all()
    assert len(expenses) == 5
    assert all(e.cadence == "monthly" and e.period_count == 6 for e in expenses)
    assert all(e.visibility == "private" and e.is_publishable for e in expenses)
    transactions = db_session.scalars(select(Transaction).where(
        Transaction.owner_account_id == OWNER_ID)).all()
    assert len(transactions) == 30
    assert all(t.source_type == "fixture" and t.provider == "fixture" for t in transactions)
    assert all("synthetic" in t.memo and "category_reference" in t.raw_payload for t in transactions)
    for expense in expenses:
        amounts = [t.amount_minor for t in transactions if t.normalized_vendor == expense.normalized_vendor]
        assert len(set(amounts)) == 6


def test_seed_preserves_existing_company_and_connection(db_session: Session) -> None:
    db_session.add(FinancialConnection(owner_account_id="acc_owner_1", customer_id="cus_saved",
                                       bank_account_id="fca_saved"))
    db_session.commit()
    seed_govcon_demo(db_session)
    assert db_session.get(Account, "acc_owner_1").business_name == "Apex Facilities Group"
    assert db_session.get(FinancialConnection, "acc_owner_1").bank_account_id == "fca_saved"
    assert db_session.scalar(select(func.count()).select_from(Transaction).where(
        Transaction.owner_account_id == "acc_owner_1")) == 0


def test_normal_dashboard_shows_govcon_only_to_its_company(client, db_session: Session) -> None:
    seed_govcon_demo(db_session)
    response = client.get("/api/expenses", headers={"X-Account-ID": OWNER_ID})
    assert response.status_code == 200
    assert len(response.json()["expenses"]) == 5
    assert client.get("/api/expenses", headers={"X-Account-ID": "acc_challenger_1"}).json()["expenses"] == []
