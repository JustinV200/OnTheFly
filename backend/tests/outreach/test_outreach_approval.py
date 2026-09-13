"""Exercises the approval gate: exact preview-to-send, idempotency under repeats, stale previews, and blocked recipients."""

import json

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.models.outreach import Invitation, SandboxOutboxMessage
from app.services.listings.visibility import unpublish_listing
from tests.outreach.support import (
    OWNER_HEADERS,
    OWNER_ID,
    approve,
    candidates_by_name,
    discover,
    outreach_row_counts,
    preview,
    publish_cleaning_listing,
)


def _setup_batch(client, db_session) -> tuple[str, list[str]]:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    candidates = candidates_by_name(client, listing.id)
    return listing.id, [candidate["id"] for candidate in candidates.values()]


def test_approval_sends_exactly_the_previewed_messages_once_each(client, db_session) -> None:
    listing_id, candidate_ids = _setup_batch(client, db_session)
    previewed = preview(client, listing_id, candidate_ids)

    response = approve(client, listing_id, candidate_ids, previewed["message_hash"])

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["replayed"] is False
    assert body["queue"] == {"attempted": 5, "sent": 5, "retry_scheduled": 0, "failed": 0, "suppressed": 0, "skipped": 0}
    assert [blocked["reason"] for blocked in previewed["blocked"]] == ["No published contact email"]
    assert {invitation["state"] for invitation in body["invitations"]} == {"sent"}

    outbox = {row.to_email: row for row in db_session.scalars(select(SandboxOutboxMessage)).all()}
    assert len(outbox) == len(previewed["messages"]) == 5
    for message in previewed["messages"]:
        stored = outbox[message["to_email"]]
        assert stored.subject == message["subject"]
        assert stored.body_text == message["body_text"]
        assert json.loads(stored.headers_json) == message["headers"]


def test_double_approval_and_double_processing_deliver_once_per_recipient(client, db_session) -> None:
    listing_id, candidate_ids = _setup_batch(client, db_session)
    message_hash = preview(client, listing_id, candidate_ids)["message_hash"]

    first = approve(client, listing_id, candidate_ids, message_hash)
    second = approve(client, listing_id, candidate_ids, message_hash)
    retry_one = client.post(f"/api/invitations/listings/{listing_id}/process-queue", headers=OWNER_HEADERS)
    retry_two = client.post(f"/api/invitations/listings/{listing_id}/process-queue", headers=OWNER_HEADERS)

    assert first.status_code == second.status_code == 200
    assert second.json()["replayed"] is True
    assert second.json()["approval_id"] == first.json()["approval_id"]
    assert second.json()["queue"]["attempted"] == 0
    assert retry_one.json()["attempted"] == retry_two.json()["attempted"] == 0
    assert outreach_row_counts(db_session) == (1, 5, 5)
    outbox = client.get(f"/api/invitations/listings/{listing_id}/outbox", headers=OWNER_HEADERS).json()["messages"]
    assert len({message["to_email"] for message in outbox}) == len(outbox) == 5


def test_a_fresh_preview_after_sending_has_nobody_left_to_invite(client, db_session) -> None:
    listing_id, candidate_ids = _setup_batch(client, db_session)
    approve(client, listing_id, candidate_ids, preview(client, listing_id, candidate_ids)["message_hash"])

    response = client.post(
        f"/api/invitations/listings/{listing_id}/preview", headers=OWNER_HEADERS, json={"candidate_ids": candidate_ids}
    )

    assert response.status_code == 400
    assert "Already invited" in response.json()["detail"]


def test_a_mismatched_or_stale_hash_is_refused_and_creates_nothing(client, db_session) -> None:
    listing_id, candidate_ids = _setup_batch(client, db_session)
    previewed = preview(client, listing_id, candidate_ids)

    wrong = approve(client, listing_id, candidate_ids, "0" * 64)
    # The owner removes one provider after previewing, so the batch no longer matches the preview.
    client.delete(f"/api/invitations/candidates/{candidate_ids[0]}", headers=OWNER_HEADERS)
    stale = approve(client, listing_id, candidate_ids[1:], previewed["message_hash"])

    assert wrong.status_code == 409
    assert stale.status_code == 409
    assert stale.json()["detail"] == "The invitation changed since you previewed it — preview again"
    assert outreach_row_counts(db_session) == (0, 0, 0)


def test_contacted_off_platform_provider_is_blocked_with_the_reason(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    added = client.post(
        f"/api/invitations/listings/{listing.id}/candidates",
        headers=OWNER_HEADERS,
        json={"business_name": "Nob Hill Cleaning", "contact_email": "hello@nobhill.example", "contacted_off_platform": True},
    ).json()
    other = client.post(
        f"/api/invitations/listings/{listing.id}/candidates",
        headers=OWNER_HEADERS,
        json={"business_name": "Russian Hill Cleaning", "contact_email": "hi@russianhill.example"},
    ).json()

    assert added["eligibility"] == {"can_invite": False, "reason": "Contacted off-platform — invite manually"}
    blocked_only = client.post(
        f"/api/invitations/listings/{listing.id}/preview", headers=OWNER_HEADERS, json={"candidate_ids": [added["id"]]}
    )
    mixed = preview(client, listing.id, [added["id"], other["id"]])

    assert blocked_only.status_code == 400
    assert "Contacted off-platform — invite manually" in blocked_only.json()["detail"]
    assert [message["to_email"] for message in mixed["messages"]] == ["hi@russianhill.example"]
    assert mixed["blocked"] == [
        {"candidate_id": added["id"], "business_name": "Nob Hill Cleaning", "reason": "Contacted off-platform — invite manually"}
    ]


def test_private_listing_refuses_preview_approve_and_discover(client, db_session) -> None:
    listing_id, candidate_ids = _setup_batch(client, db_session)
    message_hash = preview(client, listing_id, candidate_ids)["message_hash"]
    unpublish_listing(listing_id, OWNER_ID, db_session)

    responses = [
        client.post(f"/api/invitations/listings/{listing_id}/discover", headers=OWNER_HEADERS),
        client.post(f"/api/invitations/listings/{listing_id}/preview", headers=OWNER_HEADERS, json={"candidate_ids": candidate_ids}),
        approve(client, listing_id, candidate_ids, message_hash),
    ]

    assert [response.status_code for response in responses] == [400, 400, 400]
    assert outreach_row_counts(db_session) == (0, 0, 0)
    overview = client.get(f"/api/invitations/listings/{listing_id}", headers=OWNER_HEADERS).json()
    assert overview["listing_is_public"] is False
    assert {candidate["eligibility"]["reason"] for candidate in overview["candidates"]} == {"Listing is not public"}


def test_smtp_without_compliance_blocks_approval(client, db_session, monkeypatch: pytest.MonkeyPatch) -> None:
    listing_id, _ = _setup_batch(client, db_session)
    monkeypatch.setenv("OUTREACH_CHANNEL", "smtp")
    monkeypatch.setenv("OUTREACH_RECIPIENT_ALLOWLIST", "bids@bayclean.example")
    get_settings.cache_clear()
    bay_clean = candidates_by_name(client, listing_id)["Bay Clean Professional Services"]
    golden_gate = candidates_by_name(client, listing_id)["Golden Gate Janitorial"]
    assert golden_gate["eligibility"]["reason"] == "Not on the sending allowlist"

    previewed = preview(client, listing_id, [bay_clean["id"], golden_gate["id"]])
    response = approve(client, listing_id, [bay_clean["id"], golden_gate["id"]], previewed["message_hash"])

    failing = {check["key"] for check in previewed["compliance"]["checks"] if not check["passed"]}
    assert previewed["compliance"]["ready"] is False
    assert {"postal_address", "sender_identity", "smtp_server"} <= failing
    assert previewed["channel"]["delivers_real_email"] is True
    assert response.status_code == 409
    assert response.json()["detail"].startswith("Sending is blocked:")
    assert db_session.scalar(select(Invitation.id)) is None
