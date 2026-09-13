"""Roadmap 12, step 6: a piece's public payload carries nothing upstream, the payer chain can't bid, each account sees
only its direct counterparties, pieces from accepted tasks read Subcontract, and constraints flow down.
"""

import json

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import ScopeVersion
from app.models.scope import ScopeConstraint
from app.models.tasks import Task, TaskEvent
from app.services.listings.types import PublicListingProjection
from app.services.tasks.listing.publish import build_task_projection
from app.services.tasks.payer_chain import payer_chain
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


def test_published_piece_payload_names_nothing_upstream(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "piece_published")
    parent_listing = listing_of(db_session, chain.rebid_task_id)
    piece_listing = listing_of(db_session, chain.piece_task_id)
    parent_keys = requirement_keys(db_session, chain.rebid_task_id)

    public = client.get(f"/api/marketplace/{piece_listing.id}").json()["listing"]
    serialized = json.dumps(public)

    for upstream in ("GovCon", GOVCON, chain.rebid_task_id, parent_listing.id, "129800000", "141600000", *parent_keys):
        assert upstream not in serialized, upstream
    assert set(public) == set(PublicListingProjection.model_fields)
    assert public["is_subcontract"] is True
    assert public["price_minor"] is None and public["expense_id"] is None
    # The mission summary could describe the client, so template fields don't flow into a piece.
    assert public["scope_fields"] == []


def test_a_field_added_to_the_parent_never_reaches_the_piece_projection(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    chain = stage(db_session, "piece_published")
    monkeypatch.setattr(Task, "secret_upstream_note", "LEAK-FROM-PARENT", raising=False)
    piece = task_of(db_session, chain.piece_task_id)
    listing = listing_of(db_session, chain.piece_task_id)

    projection = build_task_projection(listing, piece, db_session.get(ScopeVersion, listing.scope_version_id), db_session)

    assert "LEAK-FROM-PARENT" not in projection.model_dump_json()
    assert set(projection.model_dump()) == set(PublicListingProjection.model_fields)


def test_payer_chain_spans_three_levels(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_owns")
    piece_keys = requirement_keys(db_session, chain.piece_task_id)
    sub_split = split(client, chain.piece_task_id, SUB_B, piece_keys[1:], 9_000_000, title="Continuous monitoring")
    assert sub_split["status"] == 200, sub_split["body"]
    grandchild_id = sub_split["body"]["child_task_id"]
    publish_task(client, grandchild_id, SUB_B)

    assert payer_chain(task_of(db_session, grandchild_id), db_session) == [SUB_B, PRIME_A, GOVCON]
    for payer in (PRIME_A, GOVCON):
        refused = offer(client, db_session, grandchild_id, payer, 8_000_000)
        assert refused["status"] == 400 and refused["body"]["detail"] == "This business can't bid on this listing."
    assert offer(client, db_session, grandchild_id, BAY_CLEAN, 8_000_000)["status"] == 200


def test_bidder_who_wins_the_parent_is_not_in_the_chain_of_the_buyers_earlier_piece(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    buyer_piece = split(client, chain.rebid_task_id, GOVCON, [keys[4]], 11_520_000)["body"]["child_task_id"]

    assert payer_chain(task_of(db_session, buyer_piece), db_session) == [GOVCON]


def test_buyer_api_returns_nothing_about_the_subcontractor(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_owns")
    rebid_listing = listing_of(db_session, chain.rebid_task_id)
    piece_listing = listing_of(db_session, chain.piece_task_id)
    govcon = headers(GOVCON)

    bodies = [
        client.get("/api/work", headers=govcon).text,
        client.get(f"/api/tasks/{chain.rebid_task_id}", headers=govcon).text,
        client.get(f"/api/listings/{rebid_listing.id}/inbox", headers=govcon).text,
        client.get(f"/api/listings/{rebid_listing.id}/comparison", headers=govcon).text,
        client.get("/api/marketplace", headers=govcon).text,
    ]

    for body in bodies:
        for two_steps_away in ("Sub B", SUB_B, chain.piece_task_id, piece_listing.id, "21900000", "22464000"):
            assert two_steps_away not in body, two_steps_away
    assert client.get(f"/api/tasks/{chain.piece_task_id}", headers=govcon).status_code == 404
    assert client.get(f"/api/tasks/{chain.rebid_task_id}/ways-to-save", headers=govcon).status_code == 403


def test_subcontractor_api_returns_nothing_about_the_client(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_owns")
    sub = headers(SUB_B)

    bodies = [client.get("/api/work", headers=sub).text, client.get(f"/api/tasks/{chain.piece_task_id}", headers=sub).text]

    for body in bodies:
        for two_steps_away in ("GovCon", GOVCON, chain.rebid_task_id, "141600000", "129800000"):
            assert two_steps_away not in body, two_steps_away
    assert "Prime A Federal Systems" in bodies[1]
    assert client.get(f"/api/tasks/{chain.rebid_task_id}", headers=sub).status_code == 404
    # The winner of a piece posted and owns nothing above it, so the parent link is withheld, not just unnamed.
    assert json.loads(bodies[1])["parent"] is None
    assert all(item["parent"] is None for item in json.loads(bodies[0])["owned"])


def test_task_owner_sees_the_parent_of_the_piece_it_split_off(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_owns")
    prime = headers(PRIME_A)

    detail = client.get(f"/api/tasks/{chain.piece_task_id}", headers=prime).json()
    work = client.get("/api/work", headers=prime).json()

    assert detail["parent"] == {"task_id": chain.rebid_task_id, "title": task_of(db_session, chain.rebid_task_id).title}
    piece_item = next(item for item in work["posted"] if item["task_id"] == chain.piece_task_id)
    assert piece_item["parent"]["task_id"] == chain.rebid_task_id
    parent_item = next(item for item in work["owned"] if item["task_id"] == chain.rebid_task_id)
    assert parent_item["parent"] is None


def test_buyer_still_sees_the_parent_of_its_own_piece_after_accepting_the_parent(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    piece_id = split(client, chain.rebid_task_id, GOVCON, [keys[4]], 11_520_000)["body"]["child_task_id"]
    # A buyer's split writes a new scope version, which goes back through the exact preview before bidding reopens.
    republish(client, chain.rebid_task_id, GOVCON)
    offered = offer(client, db_session, chain.rebid_task_id, PRIME_A, 120_000_000)
    assert offered["status"] == 200, offered["body"]
    accepted = accept(client, chain.rebid_task_id, GOVCON, active_offer_id(db_session, chain.rebid_task_id, PRIME_A))
    assert accepted["status"] == 200, accepted["body"]

    detail = client.get(f"/api/tasks/{piece_id}", headers=headers(GOVCON)).json()
    piece_item = next(item for item in client.get("/api/work", headers=headers(GOVCON)).json()["posted"] if item["task_id"] == piece_id)

    assert detail["parent"]["task_id"] == chain.rebid_task_id
    assert piece_item["parent"]["task_id"] == chain.rebid_task_id
    # Prime A won the parent, not the buyer's earlier piece: it can't open the piece at all.
    assert client.get(f"/api/tasks/{piece_id}", headers=headers(PRIME_A)).status_code == 404


def test_new_owner_sees_its_own_split_button(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "sub_owns")

    sub_view = client.get(f"/api/tasks/{chain.piece_task_id}", headers=headers(SUB_B)).json()
    prime_view = client.get(f"/api/tasks/{chain.piece_task_id}", headers=headers(PRIME_A)).json()

    assert sub_view["relationship"] == "owner" and sub_view["can_split"] is True
    assert prime_view["relationship"] == "poster" and prime_view["can_split"] is False
    assert "Only the current task owner can split it" in prime_view["split_block_reason"]


def test_inherited_constraints_flow_down_and_removal_is_acknowledged_and_audited(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    removal = {"removed_constraints": [{"kind": "insurance", "value": "Cyber liability, $5M"}]}

    unacknowledged = split(client, chain.rebid_task_id, PRIME_A, [keys[4]], 5_000_000, **removal)
    acknowledged = split(client, chain.rebid_task_id, PRIME_A, [keys[4]], 5_000_000, **removal, is_constraint_removal_acknowledged=True)

    assert unacknowledged["status"] == 400 and "Confirm the removal" in unacknowledged["body"]["detail"]
    assert acknowledged["status"] == 200
    child_id = acknowledged["body"]["child_task_id"]
    constraints = db_session.scalars(
        select(ScopeConstraint).where(ScopeConstraint.scope_version_id == listing_of(db_session, child_id).scope_version_id)
    ).all()
    assert {(row.kind, row.inherited_from_task_id) for row in constraints} == {
        ("clearance", chain.rebid_task_id),
        ("location", chain.rebid_task_id),
    }
    event = db_session.scalar(select(TaskEvent).where(TaskEvent.task_id == child_id, TaskEvent.kind == "constraint_removed"))
    assert event is not None and json.loads(event.detail_json)["kind"] == "insurance"


def test_parent_scope_change_flags_pieces_without_rewriting_them(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    piece_id = split(client, chain.rebid_task_id, GOVCON, [keys[4]], 11_520_000)["body"]["child_task_id"]
    piece_version = listing_of(db_session, piece_id).scope_version_id
    assert task_of(db_session, piece_id).parent_scope_changed_at is None

    other = split(client, chain.rebid_task_id, GOVCON, [keys[3]], 10_000_000)

    assert other["status"] == 200
    assert task_of(db_session, piece_id).parent_scope_changed_at is not None
    assert listing_of(db_session, piece_id).scope_version_id == piece_version
    reviewed = client.post(f"/api/tasks/{piece_id}/parent-scope-reviewed", headers=headers(GOVCON))
    assert reviewed.status_code == 200 and reviewed.json()["parent_scope_changed_at"] is None
