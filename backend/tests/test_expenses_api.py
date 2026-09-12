"""Exercises the private expenses API and header-based account access."""

from app.services.expenses.sync import sync_service_expenses
from app.services.transactions.import_run import run_import


PROVIDER_ACCOUNT_ID = "fixture_apex_main"


def test_list_expenses_requires_account_header(client) -> None:
    response = client.get("/api/expenses", headers={})

    assert response.status_code == 401


def test_list_expenses_returns_grouped_dashboard_data(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    sync_service_expenses("acc_owner_1", db_session)

    response = client.get("/api/expenses", headers={"X-Account-ID": "acc_owner_1"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["expenses"]
    assert payload["expenses"][0]["visibility"] == "private"
    assert any(expense["vendor"] == "Sparkle Clean" for expense in payload["expenses"])
