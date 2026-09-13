"""Exercises the public opt-out link: masked description, idempotent suppression, and enforcement at preview and send."""

from datetime import datetime, timezone

from sqlalchemy import func, select

from app.core.config import get_settings
from app.models.outreach import Invitation, OutreachSuppression, ProviderCandidate, SandboxOutboxMessage
from app.services.outreach import approve_invitations, build_invitation_preview, get_outreach_sender
from app.workers.outreach import process_outreach_queue
from tests.outreach.support import OWNER_HEADERS, OWNER_ID, candidates_by_name, discover, publish_cleaning_listing


def _bay_clean(client, db_session) -> tuple[str, ProviderCandidate]:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    candidate = db_session.get(ProviderCandidate, candidates_by_name(client, listing.id)["Bay Clean Professional Services"]["id"])
    assert candidate is not None
    return listing.id, candidate


def test_opt_out_describes_a_masked_address_and_is_idempotent(client, db_session) -> None:
    _, candidate = _bay_clean(client, db_session)

    before = client.get(f"/api/invitations/opt-out/{candidate.opt_out_token}")
    first = client.post(f"/api/invitations/opt-out/{candidate.opt_out_token}")
    second = client.post(f"/api/invitations/opt-out/{candidate.opt_out_token}")
    after = client.get(f"/api/invitations/opt-out/{candidate.opt_out_token}")

    assert before.json() == {"email_masked": "b***@bayclean.example", "already_opted_out": False}
    assert first.json() == second.json() == {"opted_out": True}
    assert after.json()["already_opted_out"] is True
    assert db_session.scalar(select(func.count()).select_from(OutreachSuppression)) == 1
    assert client.get("/api/invitations/opt-out/not-a-real-token").status_code == 404
    assert client.post("/api/invitations/opt-out/not-a-real-token").status_code == 404


def test_opted_out_address_is_blocked_in_preview(client, db_session) -> None:
    listing_id, candidate = _bay_clean(client, db_session)
    client.post(f"/api/invitations/opt-out/{candidate.opt_out_token}")

    overview_candidate = candidates_by_name(client, listing_id)["Bay Clean Professional Services"]
    response = client.post(
        f"/api/invitations/listings/{listing_id}/preview", headers=OWNER_HEADERS, json={"candidate_ids": [candidate.id]}
    )

    assert overview_candidate["eligibility"] == {"can_invite": False, "reason": "Opted out of invitations"}
    assert response.status_code == 400
    assert "Opted out of invitations" in response.json()["detail"]


def test_queued_invitation_to_an_address_that_opts_out_is_suppressed_without_sending(client, db_session) -> None:
    listing_id, candidate = _bay_clean(client, db_session)
    settings = get_settings()
    sender = get_outreach_sender(settings)
    # Approve through the service so the invitation is queued but not yet processed.
    previewed = build_invitation_preview(listing_id, [candidate.id], OWNER_ID, db_session, settings, sender)
    approve_invitations(listing_id, [candidate.id], previewed.message_hash, OWNER_ID, db_session, settings, sender)
    client.post(f"/api/invitations/opt-out/{candidate.opt_out_token}")

    summary = process_outreach_queue(db_session, sender, datetime.now(timezone.utc))

    assert summary.suppressed == 1
    assert summary.attempted == summary.sent == 0
    db_session.expire_all()
    assert db_session.scalar(select(Invitation.state)) == "suppressed"
    assert db_session.scalar(select(func.count()).select_from(SandboxOutboxMessage)) == 0
    overview = client.get(f"/api/invitations/listings/{listing_id}", headers=OWNER_HEADERS).json()
    assert overview["summary"]["suppressed"] == 1
