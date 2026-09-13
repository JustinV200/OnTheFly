"""Roadmap 12, step 10: GovCon → Prime A → Sub B money views reconcile to the cent, and no account's response carries a
figure from two steps away.
"""

import json

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.tasks.support import GOVCON, PRIME_A, SUB_B, headers, stage

OBSERVED = 141_600_000
PRIME_ACCEPTED = 129_800_000
CUT = 22_464_000
SUB_ACCEPTED = 21_900_000


def _work(client: TestClient, account_id: str) -> dict:
    response = client.get("/api/work", headers=headers(account_id))
    assert response.status_code == 200, response.text
    return response.json()


def test_three_account_money_views_reconcile_to_the_cent(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_owns")
    govcon, prime, sub = _work(client, GOVCON), _work(client, PRIME_A), _work(client, SUB_B)

    govcon_task = next(item for item in govcon["posted"] if item["task_id"] == chain.rebid_task_id)["buyer_money"]
    prime_task = next(item for item in prime["owned"] if item["task_id"] == chain.rebid_task_id)["owner_money"]
    prime_piece = next(item for item in prime["posted"] if item["task_id"] == chain.piece_task_id)["buyer_money"]
    sub_piece = next(item for item in sub["owned"] if item["task_id"] == chain.piece_task_id)["owner_money"]

    # GovCon: observed spend against Prime A's accepted offer.
    assert (govcon_task["baseline_minor"], govcon_task["task_amount_minor"], govcon_task["potential_difference_minor"]) == (
        OBSERVED, PRIME_ACCEPTED, OBSERVED - PRIME_ACCEPTED
    )
    assert govcon_task["difference_label"] == "Potential savings" and govcon_task["is_fully_accepted"] is True
    # Prime A: what GovCon pays it is its starting price; what it pays Sub B leaves its remainder.
    assert prime_task["starting_price_minor"] == govcon_task["task_amount_minor"]
    assert (prime_task["total_cuts_minor"], prime_task["committed_minor"], prime_task["remainder_minor"]) == (
        CUT, SUB_ACCEPTED, PRIME_ACCEPTED - SUB_ACCEPTED
    )
    assert prime_task["keep_cost_minor"] == 3120 * 13_500 + 2080 * 12_500 + 960 * 9_500 == 77_240_000
    assert prime_task["potential_margin_minor"] == 107_900_000 - 77_240_000
    # Prime A as the piece's poster, and Sub B as its owner, see the same accepted price.
    assert (prime_piece["baseline_minor"], prime_piece["task_amount_minor"], prime_piece["potential_difference_minor"]) == (CUT, SUB_ACCEPTED, CUT - SUB_ACCEPTED)
    assert sub_piece["starting_price_minor"] == prime_piece["task_amount_minor"] == prime_task["pieces"][0]["accepted_price_minor"]
    assert sub_piece["keep_cost_minor"] == 2080 * 9_800 and sub_piece["potential_margin_minor"] == SUB_ACCEPTED - 20_384_000
    # One currency and one period everywhere.
    for view in (govcon_task, prime_task, prime_piece, sub_piece):
        assert (view["currency"], view["billing_period"]) == ("USD", "annual")


def test_no_account_sees_figures_or_names_two_steps_away(client: TestClient, db_session: Session) -> None:
    stage(db_session, "sub_owns")

    govcon = json.dumps(_work(client, GOVCON))
    sub = json.dumps(_work(client, SUB_B))
    prime = json.dumps(_work(client, PRIME_A))

    for far in ("Sub B Compliance Partners", str(SUB_ACCEPTED), str(CUT)):
        assert far not in govcon
    for far in ("GovCon Industries", str(OBSERVED), str(PRIME_ACCEPTED)):
        assert far not in sub
    # Prime A is in the middle: both are its direct counterparties.
    assert "GovCon Industries" in prime and "Sub B Compliance Partners" in prime


def test_pending_task_shows_listed_amount_not_savings(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_offer")

    govcon_task = next(item for item in _work(client, GOVCON)["posted"] if item["task_id"] == chain.rebid_task_id)

    assert govcon_task["buyer_money"]["is_fully_accepted"] is False
    assert govcon_task["buyer_money"]["task_amount_minor"] == OBSERVED
    assert govcon_task["next_step"] == "1 offer to review"
    new_task = next(item for item in _work(client, GOVCON)["posted"] if item["task_id"] == chain.new_task_id)
    assert new_task["buyer_money"]["difference_label"] == "Potentially under budget"
