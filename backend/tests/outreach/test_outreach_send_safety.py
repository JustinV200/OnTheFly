"""Regression tests for send-safety gaps found in review: one invitation per address, no retry of an SMTP message the
server already accepted, and no sending of approved text the listing no longer matches or after offers have closed.
"""

from datetime import datetime, timedelta, timezone
import smtplib

from sqlalchemy import func, select, update

from app.core.config import get_settings
from app.models.listing import PublicListingRecord
from app.models.outreach import Invitation, SandboxOutboxMessage
from app.services.listings.bidding_mode import BiddingMode, set_bidding_mode
from app.services.outreach import approve_invitations, build_invitation_preview, get_outreach_sender
from app.services.outreach.senders.smtp import SmtpSender
from app.workers.outreach import process_outreach_queue
from tests.outreach.support import (
    OWNER_HEADERS,
    OWNER_ID,
    approve,
    candidates_by_name,
    discover,
    preview,
    publish_cleaning_listing,
    smtp_settings,
)
from tests.outreach.test_outreach_smtp_queue import FakeSmtp


def _add_manual_bay_clean(client, listing_id: str) -> dict:
    response = client.post(
        f"/api/invitations/listings/{listing_id}/candidates",
        headers=OWNER_HEADERS,
        json={"business_name": "Bay Clean (added by hand)", "contact_email": "BIDS@bayclean.example"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_one_address_is_invited_once_per_listing_even_through_two_candidate_records(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    discovered = candidates_by_name(client, listing.id)["Bay Clean Professional Services"]
    manual = _add_manual_bay_clean(client, listing.id)

    batch = preview(client, listing.id, [discovered["id"], manual["id"]])
    assert [message["to_email"] for message in batch["messages"]] == ["bids@bayclean.example"]
    assert batch["blocked"] == [
        {"candidate_id": manual["id"], "business_name": "Bay Clean (added by hand)", "reason": "Same email as another selected supplier"}
    ]
    assert approve(client, listing.id, [discovered["id"], manual["id"]], batch["message_hash"]).status_code == 200

    after = candidates_by_name(client, listing.id)["Bay Clean (added by hand)"]
    assert after["eligibility"] == {"can_invite": False, "reason": "Already invited"}
    assert db_session.scalar(select(func.count()).select_from(SandboxOutboxMessage)) == 1


def test_an_smtp_error_after_the_server_accepted_the_message_is_not_retried(client, db_session) -> None:
    class RejectsQuit(FakeSmtp):
        def __exit__(self, *exc_info: object) -> None:
            # smtplib raises this from __exit__ when QUIT isn't answered with 221, after DATA was accepted.
            raise smtplib.SMTPResponseException(421, b"closing")

    fake = RejectsQuit()
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    candidate_id = candidates_by_name(client, listing.id)["Bay Clean Professional Services"]["id"]
    settings = smtp_settings()
    sender = SmtpSender(settings, smtp_factory=fake)
    previewed = build_invitation_preview(listing.id, [candidate_id], OWNER_ID, db_session, settings, sender)
    approve_invitations(listing.id, [candidate_id], previewed.message_hash, OWNER_ID, db_session, settings, sender)
    now = datetime.now(timezone.utc)

    first = process_outreach_queue(db_session, sender, now)
    later = process_outreach_queue(db_session, sender, now + timedelta(hours=1))

    assert (first.sent, first.retry_scheduled, later.attempted) == (1, 0, 0)
    assert len(fake.sent) == 1
    assert db_session.scalar(select(Invitation.state)) == "sent"


def test_a_retry_is_not_sent_once_the_listing_changed_after_approval(client, db_session) -> None:
    class FailsOnce(FakeSmtp):
        def __call__(self, host: str, port: int, timeout: float) -> "FakeSmtp":
            self.connections += 1
            if self.connections == 1:
                raise smtplib.SMTPServerDisconnected("connection dropped")
            return self

    fake = FailsOnce()
    listing = publish_cleaning_listing(db_session, bidding_mode="sealed")
    discover(client, listing.id)
    candidate_id = candidates_by_name(client, listing.id)["Bay Clean Professional Services"]["id"]
    settings = smtp_settings()
    sender = SmtpSender(settings, smtp_factory=fake)
    previewed = build_invitation_preview(listing.id, [candidate_id], OWNER_ID, db_session, settings, sender)
    approve_invitations(listing.id, [candidate_id], previewed.message_hash, OWNER_ID, db_session, settings, sender)
    start = datetime.now(timezone.utc)

    first = process_outreach_queue(db_session, sender, start)
    # The approved email says offers are sealed; the owner opens bidding before the retry.
    set_bidding_mode(listing.id, BiddingMode.open.value, OWNER_ID, db_session)
    retry = process_outreach_queue(db_session, sender, start + timedelta(minutes=5))

    assert first.retry_scheduled == 1
    assert (retry.attempted, retry.failed) == (0, 1)
    assert fake.sent == [] and fake.connections == 1
    invitation = db_session.scalar(select(Invitation))
    assert invitation is not None and invitation.state == "failed"
    assert "listing changed after you approved" in (invitation.failure_reason or "")


def test_nothing_is_sent_after_the_offer_deadline_passes(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    candidate_id = candidates_by_name(client, listing.id)["Golden Gate Janitorial"]["id"]
    settings = get_settings()
    sender = get_outreach_sender(settings)
    previewed = build_invitation_preview(listing.id, [candidate_id], OWNER_ID, db_session, settings, sender)
    # Approved but not yet processed (the API sends immediately; the service leaves it queued).
    approve_invitations(listing.id, [candidate_id], previewed.message_hash, OWNER_ID, db_session, settings, sender)
    db_session.execute(
        update(PublicListingRecord)
        .where(PublicListingRecord.id == listing.id)
        .values(challenge_deadline=datetime.now(timezone.utc) - timedelta(minutes=1))
    )
    db_session.commit()

    summary = process_outreach_queue(db_session, sender, datetime.now(timezone.utc))

    assert (summary.attempted, summary.failed) == (0, 1)
    assert db_session.scalar(select(func.count()).select_from(SandboxOutboxMessage)) == 0
    assert "deadline passed" in (db_session.scalar(select(Invitation.failure_reason)) or "")
