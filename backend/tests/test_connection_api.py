"""Exercises the server-resolved connection status and import endpoints."""

from sqlalchemy import func, select

from app.models.transaction import Transaction


def test_owner_connection_starts_connected_but_not_imported(client) -> None:
    response = client.get("/api/connection", headers={"X-Account-ID": "acc_owner_1"})

    assert response.status_code == 200
    assert response.json()["status"] == "connected_not_imported"
    assert response.json()["transaction_count"] == 0


def test_import_uses_the_accounts_own_connection_and_labels_provenance(client, db_session) -> None:
    imported = client.post("/api/connection/import", headers={"X-Account-ID": "acc_owner_1"})
    status = client.get("/api/connection", headers={"X-Account-ID": "acc_owner_1"}).json()

    assert imported.status_code == 202
    assert imported.json()["new"] > 0
    assert status["status"] == "imported"
    assert status["provenance"] == ["fixture"]


def test_account_without_connection_cannot_import_anyone_elses_transactions(client, db_session) -> None:
    # The old endpoint trusted a body provider_account_id; the new one ignores any body entirely.
    response = client.post(
        "/api/connection/import",
        headers={"X-Account-ID": "acc_challenger_1"},
        json={"provider_account_id": "fixture_apex_main"},
    )

    assert response.status_code == 400
    assert db_session.scalar(select(func.count()).select_from(Transaction)) == 0
    assert client.get("/api/connection", headers={"X-Account-ID": "acc_challenger_1"}).json()["status"] == "not_connected"


def test_expense_rows_carry_provenance_and_observation_period(client) -> None:
    client.post("/api/connection/import", headers={"X-Account-ID": "acc_owner_1"})

    expenses = client.get("/api/expenses", headers={"X-Account-ID": "acc_owner_1"}).json()["expenses"]
    cleaning = next(expense for expense in expenses if expense["vendor"] == "Sparkle Clean")

    assert cleaning["provenance"] == ["fixture"]
    assert cleaning["first_seen"] < cleaning["last_seen"]
    assert cleaning["listing_id"] is None
