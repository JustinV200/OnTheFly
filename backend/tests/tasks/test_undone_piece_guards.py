"""Roadmap 12, "Undoing a split": once a split is undone the piece is dead. Its retained offers can't be accepted and
it can't be split further, so the money views of the account that undid it keep reconciling. Confirm and publish
guards are covered in test_split_ledger.py.
"""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tasks import TaskSplit
from app.services.splitting.ledger import build_ledger
from tests.tasks.support import (
    PRIME_A,
    SUB_B,
    accept,
    active_offer_id,
    headers,
    requirement_keys,
    split,
    stage,
    task_of,
)

ACCEPTED = 129_800_000


def _undo_only_split(client: TestClient, db_session: Session, parent_task_id: str) -> None:
    split_id = build_ledger(task_of(db_session, parent_task_id), db_session).pieces[0].split_id
    undone = client.post(f"/api/splits/{split_id}/undo", headers=headers(PRIME_A))
    assert undone.status_code == 200, undone.text


def test_a_piece_whose_split_was_undone_cant_accept_its_retained_offer(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_offer")
    piece_id = chain.piece_task_id
    _undo_only_split(client, db_session, chain.rebid_task_id)
    challenge_id = active_offer_id(db_session, piece_id, SUB_B)

    check = client.get(f"/api/tasks/{piece_id}/offers/{challenge_id}/acceptance-check", headers=headers(PRIME_A)).json()
    accepted = accept(client, piece_id, PRIME_A, challenge_id)

    assert check["can_accept"] is False
    assert "split_undone" in [block["code"] for block in check["blocks"]]
    assert accepted["status"] == 409 and "split was undone" in accepted["body"]["detail"]
    piece = task_of(db_session, piece_id)
    assert piece.owner_account_id == PRIME_A and piece.accepted_challenge_id is None
    # Prime A's ledger on the parent still has no pieces, so the remainder it shows is the whole accepted price.
    ledger = build_ledger(task_of(db_session, chain.rebid_task_id), db_session)
    assert (ledger.pieces, ledger.remainder_minor) == ([], ACCEPTED)


def test_a_piece_whose_split_was_undone_cant_be_split_further(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "piece_published")
    piece_id = chain.piece_task_id
    _undo_only_split(client, db_session, chain.rebid_task_id)

    result = split(client, piece_id, PRIME_A, requirement_keys(db_session, piece_id)[:1], 1_000_000)

    assert result["status"] == 400 and "split was undone" in result["body"]["detail"]
    assert db_session.scalar(select(TaskSplit.id).where(TaskSplit.parent_task_id == piece_id)) is None
