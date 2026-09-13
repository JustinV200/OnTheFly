"""Requirements an owner adds by hand: rows typed in the split drawer for the piece alone, a task with no requirement
rows that can still be split, and the current scope read back as a draft for the poster to edit.
"""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tasks import RequirementAssignment, TaskSplit
from app.services.scope.requirements import load_requirements
from tests.outreach.support import OWNER_ID, publish_cleaning_listing
from tests.tasks.support import GOVCON, PRIME_A, headers, listing_of, requirement_keys, split, stage

ADDED_ROW = {
    "text": "Send the prime a weekly status report",
    "labor_category": "Security Compliance Analyst",
    "hours_estimate": 52,
    "hours_status": "confirmed",
}


def _piece_rows(db: Session, piece_id: str) -> list[tuple[str, str]]:
    return [(row.text, row.source) for row in load_requirements(listing_of(db, piece_id).scope_version_id, db)]


def test_owner_splits_off_a_piece_made_only_of_requirements_it_adds(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    parent_keys = requirement_keys(db_session, chain.rebid_task_id)

    result = split(client, chain.rebid_task_id, PRIME_A, [], 5_000_000, title="Status reporting", new_requirements=[ADDED_ROW])

    assert result["status"] == 200, result["body"]
    piece_id = result["body"]["child_task_id"]
    assert _piece_rows(db_session, piece_id) == [(ADDED_ROW["text"], "owner")]
    # The parent's accepted scope is untouched and no parent requirement is recorded as having moved.
    assert requirement_keys(db_session, chain.rebid_task_id) == parent_keys
    assert db_session.scalars(select(RequirementAssignment)).all() == []


def test_picked_and_added_requirements_both_go_to_the_piece(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    picked = requirement_keys(db_session, chain.rebid_task_id)[2]

    result = split(client, chain.rebid_task_id, PRIME_A, [picked], 12_000_000, new_requirements=[ADDED_ROW])

    assert result["status"] == 200, result["body"]
    sources = sorted(source for _, source in _piece_rows(db_session, result["body"]["child_task_id"]))
    assert sources == ["flowed-down", "owner"]
    assignments = db_session.scalars(select(RequirementAssignment)).all()
    assert [row.requirement_key for row in assignments] == [picked]


def test_an_added_row_keeps_an_ai_draft_label_but_can_never_claim_to_flow_down(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    drafted = {**ADDED_ROW, "text": "Draft the weekly status report", "source": "llm-draft"}
    claimed = {**ADDED_ROW, "text": "Attend the client stand-up", "source": "flowed-down"}

    result = split(client, chain.rebid_task_id, PRIME_A, [], 5_000_000, new_requirements=[drafted, claimed])

    assert result["status"] == 200, result["body"]
    assert sorted(_piece_rows(db_session, result["body"]["child_task_id"])) == [
        ("Attend the client stand-up", "owner"),
        ("Draft the weekly status report", "llm-draft"),
    ]


def test_split_with_no_requirements_at_all_is_refused(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")

    result = split(client, chain.rebid_task_id, PRIME_A, [], 5_000_000)

    assert result["status"] == 400
    assert "add one for the piece" in result["body"]["detail"]
    assert db_session.scalars(select(TaskSplit)).all() == []


def test_a_suggested_split_cannot_add_requirements(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    picked = requirement_keys(db_session, chain.rebid_task_id)[2]

    result = split(
        client,
        chain.rebid_task_id,
        PRIME_A,
        [picked],
        5_000_000,
        entry_point="suggested",
        savings_card_id="any-card",
        new_requirements=[ADDED_ROW],
    )

    assert result["status"] == 400
    assert "Split it off manually" in result["body"]["detail"]


def test_a_task_with_no_requirement_rows_can_split_with_added_rows(client: TestClient, db_session: Session) -> None:
    # The legacy expense publish flow writes no requirement rows, like listings backfilled by migration 0013.
    listing = publish_cleaning_listing(db_session)
    task_id = listing.task_id
    assert load_requirements(listing.scope_version_id, db_session) == []

    detail = client.get(f"/api/tasks/{task_id}", headers=headers(OWNER_ID)).json()
    assert detail["can_split"] is True, detail["split_block_reason"]

    result = split(client, task_id, OWNER_ID, [], 40_000, billing_period="monthly", new_requirements=[{"text": "Window cleaning"}])

    assert result["status"] == 200, result["body"]
    # Splitting before acceptance lowers the buyer's own listed price by the cut.
    assert result["body"]["parent"]["listing"]["stated_price_minor"] == 200_000


def test_scope_draft_returns_the_current_rows_to_the_poster_only(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_owns")
    keys = requirement_keys(db_session, chain.rebid_task_id)

    draft = client.get(f"/api/tasks/{chain.rebid_task_id}/scope-draft", headers=headers(GOVCON))
    owner_view = client.get(f"/api/tasks/{chain.rebid_task_id}/scope-draft", headers=headers(PRIME_A))

    assert draft.status_code == 200, draft.text
    body = draft.json()
    assert [row["key"] for row in body["requirements"]] == keys
    assert body["billing_period"] == "annual" and body["price_minor"] is not None
    # Prime A owns the task through acceptance but didn't post it, so the client's scope isn't its to edit.
    assert owner_view.status_code == 404


def test_scope_draft_of_a_task_with_no_rows_comes_back_incomplete(client: TestClient, db_session: Session) -> None:
    listing = publish_cleaning_listing(db_session)

    draft = client.get(f"/api/tasks/{listing.task_id}/scope-draft", headers=headers(OWNER_ID))

    assert draft.status_code == 200, draft.text
    assert draft.json()["requirements"] == []
    assert draft.json()["price_minor"] == 240_000
