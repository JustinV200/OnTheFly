"""Roadmap 12, step 3: a new task goes private → scope confirmed → public through the exact preview, and with the price
toggle off its public payload carries no price.
"""

import json

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.demo.task_chain.drafts import zero_trust_new_task_draft
from tests.tasks.support import PRIME_A, SUB_B, headers, listing_of, task_of

BUDGET_MINOR = 18_000_000


def _create(client: TestClient, poster: str) -> str:
    response = client.post("/api/tasks", headers=headers(poster), json=zero_trust_new_task_draft().model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return response.json()["id"]


def test_new_task_moves_private_to_scope_confirmed_to_public(client: TestClient, db_session: Session) -> None:
    task_id = _create(client, SUB_B)
    assert task_of(db_session, task_id).state == "private"
    assert client.get(f"/api/marketplace/{listing_of(db_session, task_id).id}").status_code == 404

    confirmed = client.post(f"/api/tasks/{task_id}/confirm", headers=headers(SUB_B), json={"bidding_mode": "sealed", "show_price": False})
    assert confirmed.status_code == 200
    assert task_of(db_session, task_id).state == "scope_confirmed"

    preview = client.get(f"/api/tasks/{task_id}/preview", headers=headers(SUB_B)).json()
    wrong = client.post(f"/api/tasks/{task_id}/publish", headers=headers(SUB_B), json={"previewed_payload_hash": "0" * 64})
    right = client.post(f"/api/tasks/{task_id}/publish", headers=headers(SUB_B), json={"previewed_payload_hash": preview["payload_hash"]})

    assert wrong.status_code == 400
    assert right.status_code == 200
    assert task_of(db_session, task_id).state == "public"
    assert client.get(f"/api/marketplace/{listing_of(db_session, task_id).id}").status_code == 200


def test_price_toggle_off_publishes_no_price(client: TestClient, db_session: Session) -> None:
    task_id = _create(client, SUB_B)
    client.post(f"/api/tasks/{task_id}/confirm", headers=headers(SUB_B), json={"bidding_mode": "sealed"})
    preview = client.get(f"/api/tasks/{task_id}/preview", headers=headers(SUB_B)).json()
    client.post(f"/api/tasks/{task_id}/publish", headers=headers(SUB_B), json={"previewed_payload_hash": preview["payload_hash"]})

    public = client.get(f"/api/marketplace/{listing_of(db_session, task_id).id}").json()["listing"]
    assert public["price_minor"] is None
    assert public["price_disclosed"] is False
    assert public["expense_id"] is None
    # The budget isn't in the payload in any form, nor in the stored public record.
    assert str(BUDGET_MINOR) not in json.dumps(public)
    assert listing_of(db_session, task_id).price_minor is None


def test_price_toggle_on_shows_the_budget(client: TestClient, db_session: Session) -> None:
    task_id = _create(client, SUB_B)
    client.post(f"/api/tasks/{task_id}/confirm", headers=headers(SUB_B), json={"bidding_mode": "open", "show_price": True})
    preview = client.get(f"/api/tasks/{task_id}/preview", headers=headers(SUB_B)).json()

    assert preview["projection"]["price_minor"] == BUDGET_MINOR
    assert preview["projection"]["price_disclosed"] is True


def test_only_the_poster_confirms_or_publishes(client: TestClient, db_session: Session) -> None:
    task_id = _create(client, SUB_B)

    assert client.post(f"/api/tasks/{task_id}/confirm", headers=headers(PRIME_A), json={}).status_code == 404
    assert client.get(f"/api/tasks/{task_id}/preview", headers=headers(PRIME_A)).status_code == 404
    assert client.get(f"/api/tasks/{task_id}", headers=headers(PRIME_A)).status_code == 404


def test_category_fields_are_validated_by_the_template(client: TestClient) -> None:
    draft = zero_trust_new_task_draft().model_dump(mode="json")
    draft["category_fields"] = {"work_model": "on the moon"}

    response = client.post("/api/tasks", headers=headers(SUB_B), json=draft)

    assert response.status_code == 400
    assert "DevSecOps scope fields are invalid" in response.json()["detail"]
