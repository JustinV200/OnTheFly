"""Roadmap 12, step 7: cost basis rates stay private to their account, and keep cost is exact hours × rate."""

import json

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.savings.costs import compute_costs
from app.services.savings.inputs import CardInputs
from tests.savings.card_inputs import card_inputs
from tests.tasks.support import BAY_CLEAN, GOVCON, PRIME_A, SUB_B, headers, listing_of, stage


def test_rates_never_serialize_publicly(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "piece_published")
    public_bodies = [
        client.get("/api/marketplace").text,
        client.get(f"/api/marketplace/{listing_of(db_session, chain.piece_task_id).id}").text,
        client.get(f"/api/marketplace/{listing_of(db_session, chain.new_task_id).id}").text,
    ]

    for body in public_bodies:
        for private in ("rate_minor_per_hour", "internal_cost", "current_contract_rate", "keep_cost", "remainder", "savings_card"):
            assert private not in body, private


def test_each_account_reads_only_its_own_rates(client: TestClient, db_session: Session) -> None:
    stage(db_session, "start")

    prime = client.get("/api/rates", headers=headers(PRIME_A)).json()["rates"]
    govcon = client.get("/api/rates", headers=headers(GOVCON)).json()["rates"]
    stranger = client.get("/api/rates", headers=headers(BAY_CLEAN)).json()["rates"]

    assert {rate["kind"] for rate in prime} == {"internal_cost"} and len(prime) == 4
    assert {rate["kind"] for rate in govcon} == {"current_contract_rate"} and len(govcon) == 4
    assert stranger == []
    assert all(rate["provenance"] == "fixture" for rate in prime + govcon)
    other_id = govcon[0]["id"]
    assert client.delete(f"/api/rates/{other_id}", headers=headers(SUB_B)).status_code == 404


def test_owner_entered_rate_is_labeled_and_marks_cards_stale(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    first = client.get(f"/api/tasks/{chain.rebid_task_id}/ways-to-save", headers=headers(PRIME_A)).json()

    added = client.post(
        "/api/rates",
        headers=headers(PRIME_A),
        json={"kind": "internal_cost", "labor_category": "Technical Writer", "rate_minor_per_hour": 15000, "effective_date": "2026-09-01"},
    )
    second = client.get(f"/api/tasks/{chain.rebid_task_id}/ways-to-save", headers=headers(PRIME_A)).json()

    assert added.status_code == 200 and added.json()["provenance"] == "owner-entered"
    assert {card["id"] for card in first["cards"]}.isdisjoint({card["id"] for card in second["cards"]})
    writer = next(card for card in second["cards"] if card["labor_category"] == "Technical Writer")
    assert writer["inputs"]["rate"]["rate_minor_per_hour"] == 15000


def test_keep_cost_is_exact_integer_hours_times_rate() -> None:
    inputs: CardInputs = card_inputs(hours=(1040, 1040), rate_minor=13_000, median_minor=10_800)

    costs = compute_costs(inputs, oversight_minor=None, currency="USD", billing_period="annual")

    assert costs.hours_total == 2080
    assert costs.keep_cost_minor == 27_040_000
    assert costs.suggested_cut_minor == 22_464_000
    assert costs.modeled_savings_minor == 4_576_000
    assert costs.modeled_savings_basis_points == 1692
    assert json.loads(inputs.model_dump_json())["rate"]["rate_minor_per_hour"] == 13_000
