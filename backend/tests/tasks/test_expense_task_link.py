"""Spend links an expense straight to the REBID task its owner opened on it, and never to another business's task."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.tasks.support import GOVCON, PRIME_A, headers, stage, task_of


def test_expense_carries_its_rebid_task_for_the_owner_only(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    expense_id = task_of(db_session, chain.rebid_task_id).expense_id
    assert expense_id is not None

    expenses = client.get("/api/expenses", headers=headers(GOVCON)).json()["expenses"]
    detail = client.get(f"/api/expenses/{expense_id}", headers=headers(GOVCON)).json()

    linked = {row["id"]: (row["task_id"], row["task_state"]) for row in expenses if row["task_id"] is not None}
    assert linked == {expense_id: (chain.rebid_task_id, "public")}
    assert detail["task_id"] == chain.rebid_task_id
    # Expenses are owner-scoped: another business can't open GovCon's, so the task id can't reach it through Spend.
    assert client.get(f"/api/expenses/{expense_id}", headers=headers(PRIME_A)).status_code == 404
