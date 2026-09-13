"""Checks that the owner never receives a provider's opt-out token, while the copy that reaches the provider keeps it.
Whoever holds the token can opt that address out of every business's invitations, so it must stay with the recipient.
"""

from sqlalchemy import select

from app.models.outreach import Invitation, ProviderCandidate, SandboxOutboxMessage
from tests.outreach.support import OWNER_HEADERS, approve, candidates_by_name, discover, preview, publish_cleaning_listing


def test_owner_views_redact_the_token_but_the_sent_copy_keeps_it(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    bay_clean = candidates_by_name(client, listing.id)["Bay Clean Professional Services"]
    token = db_session.get(ProviderCandidate, bay_clean["id"]).opt_out_token

    previewed = preview(client, listing.id, [bay_clean["id"]])
    approved = approve(client, listing.id, [bay_clean["id"]], previewed["message_hash"])
    overview = client.get(f"/api/invitations/listings/{listing.id}", headers=OWNER_HEADERS)
    outbox = client.get(f"/api/invitations/listings/{listing.id}/outbox", headers=OWNER_HEADERS)

    assert approved.status_code == 200, approved.text
    for owner_payload in (previewed, approved.json(), overview.json(), outbox.json()):
        assert token not in str(owner_payload)

    db_session.expire_all()
    stored_invitation = db_session.scalar(select(Invitation))
    captured = db_session.scalar(select(SandboxOutboxMessage))
    assert stored_invitation is not None and captured is not None
    assert f"/opt-out/{token}" in stored_invitation.body_text
    assert f"/opt-out/{token}" in captured.body_text
    assert f"/opt-out/{token}>" in captured.headers_json
