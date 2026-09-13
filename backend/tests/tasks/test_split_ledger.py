"""Roadmap 12, step 5: the split ledger's integer rules — split, a piece accepted below its cut, undo, cuts equal to and
above the starting price, currency and period mismatch, and a buyer's parent accepted after a split.
"""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.challenge import Challenge
from app.models.tasks import TaskSplit
from app.services.splitting.ledger import build_ledger
from tests.tasks.support import (
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

ACCEPTED = 129_800_000


def test_split_takes_its_cut_from_the_remainder(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    keys = requirement_keys(db_session, chain.rebid_task_id)

    result = split(client, chain.rebid_task_id, PRIME_A, keys[2:4], 22_464_000, title="ATO")

    assert result["status"] == 200, result["body"]
    ledger = build_ledger(task_of(db_session, chain.rebid_task_id), db_session)
    assert (ledger.starting_price_minor, ledger.total_cuts_minor, ledger.committed_minor, ledger.remainder_minor) == (
        ACCEPTED, 22_464_000, 22_464_000, 107_336_000
    )
    child = task_of(db_session, result["body"]["child_task_id"])
    assert child.origin == "split" and child.depth == 1 and child.state == "private"
    assert child.posted_by_account_id == child.owner_account_id == PRIME_A
    assert listing_of(db_session, child.id).visibility == "private"


def test_piece_accepted_below_its_cut_returns_the_difference_to_the_remainder(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_owns")

    ledger = build_ledger(task_of(db_session, chain.rebid_task_id), db_session)

    assert ledger.pieces[0].cut_minor == 22_464_000
    assert ledger.pieces[0].accepted_price_minor == 21_900_000
    assert ledger.committed_minor == 21_900_000
    assert ledger.remainder_minor == ACCEPTED - 21_900_000 == 107_900_000


def test_undo_restores_the_cut_closes_the_piece_and_keeps_its_offers(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_offer")
    piece_id = chain.piece_task_id
    split_id = build_ledger(task_of(db_session, chain.rebid_task_id), db_session).pieces[0].split_id

    undone = client.post(f"/api/splits/{split_id}/undo", headers=headers(PRIME_A))

    assert undone.status_code == 200, undone.text
    ledger = build_ledger(task_of(db_session, chain.rebid_task_id), db_session)
    assert (ledger.total_cuts_minor, ledger.remainder_minor, ledger.pieces) == (0, ACCEPTED, [])
    assert listing_of(db_session, piece_id).visibility == "closed"
    assert task_of(db_session, piece_id).state == "closed"
    assert db_session.query(Challenge).filter(Challenge.listing_id == listing_of(db_session, piece_id).id).count() == 1
    # The requirements are back with the task and can go to a new piece.
    keys = requirement_keys(db_session, chain.rebid_task_id)
    assert split(client, chain.rebid_task_id, PRIME_A, keys[2:4], 20_000_000)["status"] == 200


def test_undo_is_refused_once_the_piece_accepted_an_offer(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_owns")
    split_id = build_ledger(task_of(db_session, chain.rebid_task_id), db_session).pieces[0].split_id

    refused = client.post(f"/api/splits/{split_id}/undo", headers=headers(PRIME_A))

    assert refused.status_code == 400
    assert "already accepted an offer" in refused.json()["detail"]


def test_total_cuts_may_equal_the_starting_price_but_never_exceed_it(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    keys = requirement_keys(db_session, chain.rebid_task_id)

    exceeding = split(client, chain.rebid_task_id, PRIME_A, keys[:1], ACCEPTED + 1)
    first = split(client, chain.rebid_task_id, PRIME_A, keys[:1], 100_000_000)
    over_remainder = split(client, chain.rebid_task_id, PRIME_A, keys[1:2], 29_800_001)
    exact = split(client, chain.rebid_task_id, PRIME_A, keys[1:2], 29_800_000)
    after_zero = split(client, chain.rebid_task_id, PRIME_A, keys[2:3], 1)

    assert exceeding["status"] == 400 and exceeding["body"]["detail"] == "Total cuts would exceed the starting price."
    assert first["status"] == 200 and exact["status"] == 200
    assert over_remainder["status"] == 400
    assert after_zero["status"] == 400
    ledger = build_ledger(task_of(db_session, chain.rebid_task_id), db_session)
    assert (ledger.total_cuts_minor, ledger.remainder_minor) == (ACCEPTED, 0)


def test_cut_in_another_currency_or_period_is_refused(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    keys = requirement_keys(db_session, chain.rebid_task_id)

    currency = split(client, chain.rebid_task_id, PRIME_A, keys[:1], 1_000_000, currency="EUR")
    period = split(client, chain.rebid_task_id, PRIME_A, keys[:1], 1_000_000, billing_period="monthly")

    assert currency["status"] == 400 and "currency (USD)" in currency["body"]["detail"]
    assert period["status"] == 400 and "billing period (annual)" in period["body"]["detail"]


def test_a_requirement_goes_to_at_most_one_active_piece(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    keys = requirement_keys(db_session, chain.rebid_task_id)

    assert split(client, chain.rebid_task_id, PRIME_A, [keys[0]], 1_000_000)["status"] == 200
    again = split(client, chain.rebid_task_id, PRIME_A, [keys[0]], 1_000_000)

    assert again["status"] == 400 and "exactly one active piece" in again["body"]["detail"]


def test_buyer_split_before_acceptance_then_parent_accepted(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    tech_docs = keys[4]

    buyer_split = split(client, chain.rebid_task_id, GOVCON, [tech_docs], 11_520_000, title="Documentation")
    assert buyer_split["status"] == 200, buyer_split["body"]
    piece_id = buyer_split["body"]["child_task_id"]

    # The parent's listing now lists four requirements at the price less the cut, and waits for the buyer to republish.
    parent_listing = listing_of(db_session, chain.rebid_task_id)
    assert parent_listing.visibility == "scope_confirmed"
    assert requirement_keys(db_session, chain.rebid_task_id) == keys[:4]
    buyer_ledger = build_ledger(task_of(db_session, chain.rebid_task_id), db_session)
    assert (buyer_ledger.starting_price_minor, buyer_ledger.total_cuts_minor, buyer_ledger.remainder_minor) == (141_600_000, 11_520_000, 130_080_000)

    republish(client, chain.rebid_task_id, GOVCON)
    assert offer(client, db_session, chain.rebid_task_id, PRIME_A, 120_000_000)["status"] == 200
    assert accept(client, chain.rebid_task_id, GOVCON, active_offer_id(db_session, chain.rebid_task_id, PRIME_A))["status"] == 200

    # Prime A's ledger starts from its accepted offer; the buyer's earlier piece stays with the buyer.
    owner_ledger = build_ledger(task_of(db_session, chain.rebid_task_id), db_session)
    assert (owner_ledger.starting_price_minor, owner_ledger.pieces, owner_ledger.remainder_minor) == (120_000_000, [], 120_000_000)
    piece = task_of(db_session, piece_id)
    assert piece.posted_by_account_id == piece.owner_account_id == GOVCON
    # The buyer can't undo its split any more, and the bidder who won the parent may bid on the buyer's piece.
    buyer_split_id = db_session.scalar(select(TaskSplit.id).where(TaskSplit.child_task_id == piece_id))
    undo = client.post(f"/api/splits/{buyer_split_id}/undo", headers=headers(GOVCON))
    assert undo.status_code == 400 and "accepted an offer on the parent task" in undo.json()["detail"]
    publish_task(client, piece_id, GOVCON)
    assert offer(client, db_session, piece_id, PRIME_A, 10_000_000)["status"] == 200
    assert offer(client, db_session, piece_id, SUB_B, 9_000_000)["status"] == 200
