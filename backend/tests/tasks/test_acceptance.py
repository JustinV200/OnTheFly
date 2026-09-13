"""Roadmap 12, step 4: accepting an offer closes bidding and moves ownership; late bids, double cover and a negative
remainder are refused; an offer above the listed price needs confirmation.
"""

import json

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tasks import TaskEvent
from app.services.tasks.acceptance import accept_offer
from tests.tasks.support import (
    BAY_CLEAN,
    GOVCON,
    PRIME_A,
    SUB_B,
    accept,
    active_offer_id,
    headers,
    listing_of,
    offer,
    publish_task,
    republish,
    requirement_keys,
    split,
    stage,
    task_of,
)


def test_acceptance_transfers_ownership_and_audits_it(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_offer")
    challenge_id = active_offer_id(db_session, chain.rebid_task_id, PRIME_A)

    result = accept(client, chain.rebid_task_id, GOVCON, challenge_id)

    assert result["status"] == 200, result["body"]
    task = task_of(db_session, chain.rebid_task_id)
    assert task.owner_account_id == PRIME_A and task.posted_by_account_id == GOVCON
    assert task.accepted_challenge_id == challenge_id and task.state == "accepted"
    assert task.accepted_price_minor == 129_800_000
    assert listing_of(db_session, chain.rebid_task_id).visibility == "accepted"
    transfer = db_session.scalar(select(TaskEvent).where(TaskEvent.task_id == task.id, TaskEvent.kind == "ownership_transferred"))
    assert transfer is not None and transfer.account_id == GOVCON
    assert json.loads(transfer.detail_json) == {"prior_owner_account_id": GOVCON, "new_owner_account_id": PRIME_A}


def test_only_the_new_owner_can_split_after_acceptance(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    keys = requirement_keys(db_session, chain.rebid_task_id)

    refused = split(client, chain.rebid_task_id, GOVCON, [keys[4]], 5_000_000)
    stranger = split(client, chain.rebid_task_id, SUB_B, [keys[4]], 5_000_000)
    allowed = split(client, chain.rebid_task_id, PRIME_A, [keys[4]], 5_000_000)

    assert refused["status"] == 403
    assert "ownership moved to that bidder" in refused["body"]["detail"]
    assert stranger["status"] == 404
    assert allowed["status"] == 200, allowed["body"]


def test_late_bids_and_revisions_are_rejected_with_a_clear_message(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")

    late = offer(client, db_session, chain.rebid_task_id, BAY_CLEAN, 100_000_000)
    revision = offer(client, db_session, chain.rebid_task_id, PRIME_A, 120_000_000)

    assert late["status"] == revision["status"] == 400
    assert late["body"]["detail"] == "Bidding is closed: this task already accepted an offer."


def test_offer_on_a_scope_that_includes_a_split_requirement_is_blocked(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_offer")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    challenge_id = active_offer_id(db_session, chain.rebid_task_id, PRIME_A)
    assert split(client, chain.rebid_task_id, GOVCON, [keys[4]], 11_520_000)["status"] == 200

    check = client.get(f"/api/tasks/{chain.rebid_task_id}/offers/{challenge_id}/acceptance-check", headers=headers(GOVCON)).json()
    blocked = accept(client, chain.rebid_task_id, GOVCON, challenge_id)

    assert [block["code"] for block in check["blocks"]] == ["double_cover"]
    assert blocked["status"] == 409 and "pay twice" in blocked["body"]["detail"]
    # Once the buyer republishes and the bidder revises onto the current scope, the offer can be accepted.
    republish(client, chain.rebid_task_id, GOVCON)
    assert offer(client, db_session, chain.rebid_task_id, PRIME_A, 118_000_000)["status"] == 200
    assert accept(client, chain.rebid_task_id, GOVCON, challenge_id)["status"] == 200


def test_accepting_a_piece_offer_that_would_make_the_remainder_negative_is_blocked(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    # Total cuts equal the starting price, so the remainder is exactly zero.
    first = split(client, chain.rebid_task_id, PRIME_A, keys[:4], 120_000_000)
    second = split(client, chain.rebid_task_id, PRIME_A, keys[4:], 9_800_000)
    assert first["status"] == second["status"] == 200
    piece_id = second["body"]["child_task_id"]
    publish_task(client, piece_id, PRIME_A)
    assert offer(client, db_session, piece_id, SUB_B, 9_800_001)["status"] == 200
    challenge_id = active_offer_id(db_session, piece_id, SUB_B)

    check = client.get(f"/api/tasks/{piece_id}/offers/{challenge_id}/acceptance-check", headers=headers(PRIME_A)).json()
    blocked = accept(client, piece_id, PRIME_A, challenge_id, confirm_above=True)

    assert check["remainder_after_minor"] == -1
    assert "negative_remainder" in [block["code"] for block in check["blocks"]]
    assert blocked["status"] == 409


def test_offer_above_the_listed_price_needs_confirmation(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    assert offer(client, db_session, chain.rebid_task_id, PRIME_A, 150_000_000)["status"] == 200
    challenge_id = active_offer_id(db_session, chain.rebid_task_id, PRIME_A)

    unconfirmed = accept(client, chain.rebid_task_id, GOVCON, challenge_id)
    confirmed = accept(client, chain.rebid_task_id, GOVCON, challenge_id, confirm_above=True)

    assert unconfirmed["status"] == 409 and "above your listed price" in unconfirmed["body"]["detail"]
    assert confirmed["status"] == 200


def test_only_the_poster_can_accept(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_offer")
    challenge_id = active_offer_id(db_session, chain.rebid_task_id, PRIME_A)

    assert accept(client, chain.rebid_task_id, PRIME_A, challenge_id)["status"] == 404
    assert accept(client, chain.rebid_task_id, SUB_B, challenge_id)["status"] == 404


def test_service_refuses_a_second_acceptance(db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    challenge_id = active_offer_id(db_session, chain.rebid_task_id, PRIME_A)

    with pytest.raises(HTTPException) as refused:
        accept_offer(chain.rebid_task_id, challenge_id, GOVCON, False, db_session)

    assert refused.value.status_code == 409
    assert "already accepted" in str(refused.value.detail)
