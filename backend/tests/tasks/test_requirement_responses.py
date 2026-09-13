"""Roadmap 12, step 2: DevSecOps scope saves as requirement rows; every offer answers every requirement; revisions and
scope edits keep each version's own responses; completeness is scored from the responses.
"""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scope import ChallengeRequirementResponse, Requirement, ScopeConstraint
from app.services.demo.task_chain.drafts import devsecops_rebid_draft
from tests.tasks.support import BAY_CLEAN, GOVCON, PRIME_A, headers, listing_of, offer, requirement_keys, stage


def test_devsecops_scope_saves_tagged_requirements_and_constraints(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    listing = listing_of(db_session, chain.rebid_task_id)

    rows = db_session.scalars(select(Requirement).where(Requirement.scope_version_id == listing.scope_version_id)).all()
    constraints = db_session.scalars(select(ScopeConstraint).where(ScopeConstraint.scope_version_id == listing.scope_version_id)).all()
    assert len(rows) == 5
    assert {row.labor_category for row in rows} == {"DevSecOps Engineer", "Cloud Engineer", "Security Compliance Analyst", "Technical Writer"}
    assert all(row.tags_status == "confirmed" and row.hours_status == "confirmed" for row in rows)
    assert sum(row.hours_estimate or 0 for row in rows) == 8240
    assert {constraint.kind for constraint in constraints} == {"clearance", "location", "insurance"}

    public = client.get(f"/api/marketplace/{listing.id}").json()["listing"]
    assert [item["text"] for item in public["requirements"]] == [row.text for row in rows]
    assert {"label": "Work model", "value": "Hybrid"} in public["scope_fields"]
    # Tag status, PSC/NAICS and where a constraint came from are not public fields.
    assert set(public["requirements"][0]) == {"key", "text", "priority", "labor_category", "hours"}
    assert set(public["constraints"][0]) == {"kind", "value"}


def test_an_offer_must_answer_every_requirement_exactly_once(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    listing = listing_of(db_session, chain.rebid_task_id)
    keys = requirement_keys(db_session, chain.rebid_task_id)
    base = {"acknowledged_bidding_mode": "sealed", "price_minor": 120_000_000, "billing_frequency": "annual"}

    missing = client.post(f"/api/listings/{listing.id}/challenges", headers=headers(PRIME_A), json={**base, "requirement_responses": [{"requirement_key": keys[0], "is_included": True}]})
    unknown = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers=headers(PRIME_A),
        json={**base, "requirement_responses": [*({"requirement_key": key, "is_included": True} for key in keys), {"requirement_key": "req_nope", "is_included": True}]},
    )
    none_sent = client.post(f"/api/listings/{listing.id}/challenges", headers=headers(PRIME_A), json=base)

    assert missing.status_code == 400 and "4 still unanswered" in missing.json()["detail"]
    assert unknown.status_code == 400
    assert none_sent.status_code == 400
    assert offer(client, db_session, chain.rebid_task_id, PRIME_A, 120_000_000)["status"] == 200
    stored = db_session.scalars(select(ChallengeRequirementResponse)).all()
    assert sorted(row.requirement_key for row in stored) == sorted(keys)


def test_a_revision_keeps_its_own_responses(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    first = offer(client, db_session, chain.rebid_task_id, PRIME_A, 125_000_000, excluded_keys=(keys[4],))
    revised = offer(client, db_session, chain.rebid_task_id, PRIME_A, 128_000_000)

    assert first["status"] == revised["status"] == 200
    db_session.expire_all()
    rows = db_session.scalars(select(ChallengeRequirementResponse).where(ChallengeRequirementResponse.challenge_id == first["body"]["id"])).all()
    snapshot = [row for row in rows if row.challenge_revision_id is not None]
    current = [row for row in rows if row.challenge_revision_id is None]
    assert len(snapshot) == len(current) == 5
    assert {row.requirement_key for row in snapshot if not row.is_included} == {keys[4]}
    assert all(row.is_included for row in current)


def test_editing_scope_never_changes_an_earlier_offers_responses(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "prime_offer")
    listing = listing_of(db_session, chain.rebid_task_id)
    old_version = listing.scope_version_id
    before = {(row.requirement_key, row.is_included, row.scope_version_id) for row in db_session.scalars(select(ChallengeRequirementResponse)).all()}

    draft = devsecops_rebid_draft()
    draft.requirements = draft.requirements[:4]
    response = client.post(
        "/api/tasks/rebid",
        headers=headers(GOVCON),
        json={"expense_id": db_session.get(type(listing), listing.id).expense_id, "draft": draft.model_dump(mode="json"), "choices": {"bidding_mode": "sealed"}},
    )

    assert response.status_code == 200, response.text
    assert listing_of(db_session, chain.rebid_task_id).scope_version_id != old_version
    after = {(row.requirement_key, row.is_included, row.scope_version_id) for row in db_session.scalars(select(ChallengeRequirementResponse)).all()}
    assert after == before
    assert all(version == old_version for _, _, version in after)


def test_completeness_is_scored_from_responses_before_price(client: TestClient, db_session: Session) -> None:
    chain = stage(db_session, "rebid_published")
    keys = requirement_keys(db_session, chain.rebid_task_id)
    offer(client, db_session, chain.rebid_task_id, PRIME_A, 130_000_000)
    offer(client, db_session, chain.rebid_task_id, BAY_CLEAN, 100_000_000, excluded_keys=(keys[0],))
    listing = listing_of(db_session, chain.rebid_task_id)

    inbox = client.get(f"/api/listings/{listing.id}/inbox", headers=headers(GOVCON)).json()
    rows = {row["challenger_name"]: row for row in inbox["challenges"]}

    assert rows["Prime A Federal Systems"]["scope_completeness"] == 1.0
    assert rows["Bay Clean Professional Services"]["scope_completeness"] == 0.8
    assert rows["Bay Clean Professional Services"]["missing_items"] == [
        "requirement:Build and maintain CI/CD pipelines with integrated security scanning (SAST, DAST, SBOM)"
    ]
    # The cheaper offer that drops a requirement ranks after the complete one.
    assert [row["challenger_name"] for row in inbox["challenges"]] == ["Prime A Federal Systems", "Bay Clean Professional Services"]
    assert inbox["task"]["origin"] == "rebid" and inbox["task"]["is_owned_by_you"] is True
