"""Presenter controls for the task-chain demo: staging runs through the real services, refuses to delete a genuine offer,
and is unavailable when turned off.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.account import Account
from app.models.challenge import Challenge
from app.models.tasks import Task
from app.services.challenges.submit import submit_challenge
from tests.tasks.support import listing_of, requirement_keys, stage


def test_stage_endpoint_replays_the_chain(client: TestClient) -> None:
    controls = client.get("/api/demo/task-chain").json()
    staged = client.post("/api/demo/task-chain/stage", json={"stage": "sub_owns"})

    assert controls == {"is_enabled": True, "stages": ["start", "rebid_published", "prime_offer", "prime_owns", "piece_published", "sub_offer", "sub_owns"]}
    assert staged.status_code == 200, staged.text
    body = staged.json()
    assert body["rebid_task_id"] and body["piece_task_id"] and body["new_task_id"]


def test_restaging_replaces_the_chain_instead_of_duplicating_it(db_session: Session) -> None:
    stage(db_session, "sub_owns")
    stage(db_session, "piece_published")

    assert db_session.scalar(select(func.count()).select_from(Task)) == 3
    assert db_session.scalar(select(func.count()).select_from(Challenge)) == 1


def test_offers_staged_by_demo_accounts_are_demo_data(db_session: Session) -> None:
    stage(db_session, "sub_offer")

    assert {row for row in db_session.scalars(select(Challenge.provenance))} == {"demo_data"}


def test_reset_refuses_when_a_genuine_offer_is_on_the_chain(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    db_session.add(Account(id="acc_real", handle="real-co", business_name="Real Co", service_area="Virginia"))
    db_session.commit()
    listing = listing_of(db_session, chain.rebid_task_id)
    submit_challenge(
        listing.id,
        "acc_real",
        {
            "acknowledged_bidding_mode": "sealed",
            "price_minor": 100_000_000,
            "billing_frequency": "annual",
            "requirement_responses": [{"requirement_key": key, "is_included": True} for key in requirement_keys(db_session, chain.rebid_task_id)],
        },
        db_session,
    )

    refused = client.post("/api/demo/task-chain/stage", json={"stage": "start"})

    assert refused.status_code == 409
    assert db_session.scalar(select(func.count()).select_from(Challenge)) == 1


def test_stage_is_refused_when_demo_controls_are_off(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEMO_CONTROLS_ENABLED", "false")
    get_settings.cache_clear()

    assert client.post("/api/demo/task-chain/stage", json={"stage": "start"}).status_code == 403
    assert client.get("/api/demo/task-chain").json()["is_enabled"] is False
