"""Roadmap 12, step 9: tiers at every threshold boundary, no suggestion without rates, reproducible cards, dismissals,
oversight, config thresholds on every card, and the per-task suggestion cap.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.savings import CostBasisRate, SavingsCard
from app.services.savings.cards import current_cards
from app.services.savings.costs import compute_costs
from app.services.savings.inputs import CardInputs
from app.services.savings.thresholds import SavingsThresholds, current_thresholds
from app.services.savings.viability import classify
from tests.savings.card_inputs import card_inputs
from tests.tasks.support import GOVCON, PRIME_A, headers, requirement_keys, split, stage, task_of

THRESHOLDS = SavingsThresholds(
    min_basis_points=1000, min_annual_minor=2_500_000, min_suppliers=3, lookback_years=5, max_suggested_pieces_per_task=5
)


def _tier(inputs: CardInputs, oversight_minor: int | None = None) -> str:
    costs = compute_costs(inputs, oversight_minor, "USD", "annual")
    return classify(inputs, costs, THRESHOLDS).tier


def test_basis_points_at_just_below_and_just_above_the_threshold() -> None:
    # Annual savings are far above the 2_500_000 minimum in all three, so only the percentage decides.
    just_above = card_inputs(hours=(10_000,), rate_minor=11_112, median_minor=10_000)  # 11_120_000 / 111_120_000 → 1001
    at = card_inputs(hours=(10_000,), rate_minor=11_111, median_minor=10_000)  # 11_110_000 / 111_110_000 = 999.91 → 1000
    just_below = card_inputs(hours=(9_000,), rate_minor=11_110, median_minor=10_000)  # 9_990_000 / 99_990_000 = 999.1 → 999

    assert compute_costs(just_above, None, "USD", "annual").modeled_savings_basis_points == 1001
    assert _tier(just_above) == "potential_savings"
    assert compute_costs(at, None, "USD", "annual").modeled_savings_basis_points == 1000
    assert _tier(at) == "potential_savings"
    assert compute_costs(just_below, None, "USD", "annual").modeled_savings_basis_points == 999
    assert _tier(just_below) == "not_viable"


def test_annual_savings_at_just_below_and_just_above_the_minimum() -> None:
    # Savings of exactly 2_500_000, then 2_499_999 (an oversight cost of 1) and 2_501_000 (a rate one cent higher).
    inputs = card_inputs(hours=(1000,), rate_minor=12_500, median_minor=10_000)  # savings 2_500_000, 2000 bps

    assert compute_costs(inputs, None, "USD", "annual").annual_savings_minor == 2_500_000
    assert _tier(inputs) == "potential_savings"
    assert _tier(inputs, oversight_minor=1) == "not_viable"
    assert _tier(card_inputs(hours=(1000,), rate_minor=12_501, median_minor=10_000)) == "potential_savings"


def test_suppliers_at_just_below_and_just_above_the_minimum() -> None:
    base = {"hours": (1000,), "rate_minor": 20_000, "median_minor": 10_000}

    assert _tier(card_inputs(**base, distinct_suppliers=3)) == "potential_savings"
    assert _tier(card_inputs(**base, distinct_suppliers=2)) == "not_viable"
    assert _tier(card_inputs(**base, distinct_suppliers=4)) == "potential_savings"


def test_specialist_market_needs_rates_and_not_checked_tiers() -> None:
    assert _tier(card_inputs(rate_minor=9_000, median_minor=10_000)) == "specialist_market"
    assert _tier(card_inputs(rate_minor=None)) == "needs_rates"
    assert _tier(card_inputs(rate_minor=20_000, supplier_status="unavailable")) == "not_viable"
    assert _tier(card_inputs(rate_minor=20_000, rate_status="unavailable")) == "not_viable"
    assert _tier(card_inputs(hours=(None,), rate_minor=20_000)) == "not_viable"
    assert _tier(card_inputs(rate_minor=20_000, remainder_minor=1)) == "not_viable"


def test_oversight_and_draft_hours_make_a_card_provisional() -> None:
    confirmed = card_inputs(hours=(1000,), rate_minor=20_000, median_minor=10_000)
    draft = card_inputs(hours=(1000,), rate_minor=20_000, median_minor=10_000, hours_status="draft")

    assert compute_costs(confirmed, None, "USD", "annual").is_provisional is True
    assert compute_costs(confirmed, 500_000, "USD", "annual").is_provisional is False
    assert compute_costs(confirmed, 500_000, "USD", "annual").modeled_savings_minor == 9_500_000
    assert compute_costs(draft, 500_000, "USD", "annual").is_provisional is True


def test_prime_a_gets_exactly_one_suggestion_from_its_own_rates(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")

    body = client.get(f"/api/tasks/{chain.rebid_task_id}/ways-to-save", headers=headers(PRIME_A)).json()

    tiers = {card["labor_category"]: card["tier"] for card in body["cards"]}
    assert tiers == {
        "Security Compliance Analyst": "potential_savings",
        "DevSecOps Engineer": "specialist_market",
        "Cloud Engineer": "specialist_market",
        "Technical Writer": "not_viable",
    }
    suggestion = next(card for card in body["cards"] if card["tier"] == "potential_savings")
    assert (suggestion["keep_cost_minor"], suggestion["suggested_cut_minor"], suggestion["modeled_savings_minor"]) == (
        27_040_000, 22_464_000, 4_576_000
    )
    assert suggestion["label"] == "Modeled cut from demo market data — not an offer"
    assert body["thresholds"] == current_thresholds().model_dump()
    assert all(card["thresholds"] == body["thresholds"] for card in body["cards"])


def test_a_segment_without_rates_never_reaches_the_suggestions(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    db_session.execute(delete(CostBasisRate).where(CostBasisRate.account_id == PRIME_A, CostBasisRate.labor_category == "Security Compliance Analyst"))
    db_session.commit()

    body = client.post(f"/api/tasks/{chain.rebid_task_id}/ways-to-save/refresh", headers=headers(PRIME_A)).json()

    card = next(card for card in body["cards"] if card["labor_category"] == "Security Compliance Analyst")
    assert card["tier"] == "needs_rates"
    assert card["reasons"] == ["Add your rate for Security Compliance Analyst to find specific savings."]
    assert not [card for card in body["cards"] if card["tier"] == "potential_savings"]
    keys = [requirement["key"] for requirement in card["inputs"]["requirements"]]
    refused = split(client, chain.rebid_task_id, PRIME_A, keys, 20_000_000, entry_point="suggested", savings_card_id=card["id"])
    assert refused["status"] == 400 and "isn't a suggestion" in refused["body"]["detail"]


def test_cards_reproduce_identical_integers_from_stored_inputs(db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    cards = current_cards(task_of(db_session, chain.rebid_task_id), PRIME_A, db_session)

    for card in cards:
        recomputed = compute_costs(CardInputs.model_validate_json(card.inputs_json), card.oversight_minor, card.currency, card.billing_period)
        assert (recomputed.keep_cost_minor, recomputed.suggested_cut_minor, recomputed.modeled_savings_minor, recomputed.modeled_savings_basis_points) == (
            card.keep_cost_minor, card.suggested_cut_minor, card.modeled_savings_minor, card.modeled_savings_basis_points
        )


def test_dismissal_holds_for_the_scope_version_and_oversight_recomputes(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    body = client.get(f"/api/tasks/{chain.rebid_task_id}/ways-to-save", headers=headers(PRIME_A)).json()
    suggestion = next(card for card in body["cards"] if card["tier"] == "potential_savings")

    dismissed = client.post(f"/api/savings-cards/{suggestion['id']}/dismiss", headers=headers(PRIME_A)).json()
    refreshed = client.post(f"/api/tasks/{chain.rebid_task_id}/ways-to-save/refresh", headers=headers(PRIME_A)).json()
    carried = next(card for card in refreshed["cards"] if card["labor_category"] == "Security Compliance Analyst")
    oversight = client.put(f"/api/savings-cards/{carried['id']}/oversight", headers=headers(PRIME_A), json={"oversight_minor": 1_000_000}).json()

    assert dismissed["status"] == "dismissed"
    assert carried["status"] == "dismissed" and carried["id"] != suggestion["id"]
    assert oversight["modeled_savings_minor"] == 3_576_000 and oversight["is_provisional"] is False
    assert oversight["tier"] == "potential_savings"
    assert db_session.get(SavingsCard, suggestion["id"]).status == "stale"


def test_suggested_pieces_are_capped_per_task_but_manual_splits_are_not(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("MAX_SUGGESTED_PIECES_PER_TASK", "1")
    get_settings.cache_clear()
    chain = stage(db_session, "rebid_published")

    def first_suggestion() -> dict:
        cards = client.get(f"/api/tasks/{chain.rebid_task_id}/ways-to-save", headers=headers(GOVCON)).json()["cards"]
        return next(card for card in cards if card["tier"] == "potential_savings" and card["status"] == "suggested")

    card = first_suggestion()
    keys = [requirement["key"] for requirement in card["inputs"]["requirements"]]
    first = split(client, chain.rebid_task_id, GOVCON, keys, card["suggested_cut_minor"], entry_point="suggested", savings_card_id=card["id"])
    assert first["status"] == 200, first["body"]

    card = first_suggestion()
    keys = [requirement["key"] for requirement in card["inputs"]["requirements"]]
    capped = split(client, chain.rebid_task_id, GOVCON, keys, card["suggested_cut_minor"], entry_point="suggested", savings_card_id=card["id"])
    manual = split(client, chain.rebid_task_id, GOVCON, keys, card["suggested_cut_minor"])

    assert capped["status"] == 400 and "the most allowed" in capped["body"]["detail"]
    assert manual["status"] == 200
    # Two requirements stay with GovCon's own listing after both splits.
    assert len(requirement_keys(db_session, chain.rebid_task_id)) == 2
