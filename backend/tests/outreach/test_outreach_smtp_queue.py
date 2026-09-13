"""Exercises the SMTP channel with a fake server and the queue's retry, cap, and crash-safety rules."""

from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import smtplib

from sqlalchemy import func, select, update

from app.core.config import get_settings
from app.models.outreach import Invitation, SandboxOutboxMessage
from app.services.outreach import OutgoingMessage, approve_invitations, build_invitation_preview, get_outreach_sender
from app.services.outreach.senders.smtp import SmtpSender
from app.workers.outreach import process_outreach_queue
from tests.outreach.support import OWNER_ID, candidates_by_name, discover, publish_cleaning_listing, smtp_settings


class FakeSmtp:
    """Records connections and messages; optionally fails on connect."""

    def __init__(self, connect_error: Exception | None = None) -> None:
        self.connect_error = connect_error
        self.connections = 0
        self.sent: list[EmailMessage] = []

    def __call__(self, host: str, port: int, timeout: float) -> "FakeSmtp":
        self.connections += 1
        if self.connect_error is not None:
            raise self.connect_error
        return self

    def __enter__(self) -> "FakeSmtp":
        return self

    def __exit__(self, *exc_info: object) -> None:
        return None

    def starttls(self, *, context: object) -> None:
        return None

    def login(self, user: str, password: str) -> None:
        return None

    def send_message(self, msg: EmailMessage, to_addrs: list[str]) -> dict:
        self.sent.append(msg)
        return {}


def _message(to_email: str) -> OutgoingMessage:
    return OutgoingMessage(
        invitation_id="invitation-1",
        to_email=to_email,
        to_name="Bay Clean",
        subject="Subject",
        body_text="Body",
        headers={"From": "On the Fly <invitations@onthefly.test>", "To": f"Bay Clean <{to_email}>", "Subject": "Subject"},
    )


def _queued_smtp_invitation(client, db_session, fake: FakeSmtp) -> tuple[str, SmtpSender]:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    candidate_id = candidates_by_name(client, listing.id)["Bay Clean Professional Services"]["id"]
    settings = smtp_settings()
    sender = SmtpSender(settings, smtp_factory=fake)
    previewed = build_invitation_preview(listing.id, [candidate_id], OWNER_ID, db_session, settings, sender)
    assert previewed.compliance.ready is True
    approve_invitations(listing.id, [candidate_id], previewed.message_hash, OWNER_ID, db_session, settings, sender)
    return listing.id, sender


def test_allowlisted_recipient_is_sent_once_with_the_approved_headers(client, db_session) -> None:
    fake = FakeSmtp()
    _, sender = _queued_smtp_invitation(client, db_session, fake)
    now = datetime.now(timezone.utc)

    first = process_outreach_queue(db_session, sender, now)
    second = process_outreach_queue(db_session, sender, now + timedelta(hours=1))

    assert (first.sent, second.attempted) == (1, 0)
    assert len(fake.sent) == 1
    sent = fake.sent[0]
    assert sent["To"] == "Bay Clean Professional Services <bids@bayclean.example>"
    assert sent["List-Unsubscribe"].startswith("<http://localhost:5173/opt-out/")
    assert sent["Message-ID"].endswith("@onthefly.test>")
    invitation = db_session.scalar(select(Invitation))
    assert invitation is not None
    assert (invitation.state, invitation.provider_message_id) == ("sent", sent["Message-ID"])


def test_recipient_off_the_allowlist_fails_permanently_without_connecting(db_session) -> None:
    fake = FakeSmtp()
    sender = SmtpSender(smtp_settings(), smtp_factory=fake)

    result = sender.send(_message("quotes@goldengatejanitorial.example"), "listing:candidate", db_session)
    empty_allowlist = SmtpSender(smtp_settings(outreach_recipient_allowlist=""), smtp_factory=fake).send(
        _message("bids@bayclean.example"), "listing:candidate", db_session
    )

    assert (result.outcome, result.detail) == ("permanent_failure", "recipient not on the sending allowlist")
    assert empty_allowlist.outcome == "permanent_failure"
    assert fake.connections == 0


def test_transient_failures_back_off_then_fail_after_three_attempts(client, db_session) -> None:
    fake = FakeSmtp(connect_error=smtplib.SMTPServerDisconnected("connection dropped"))
    _, sender = _queued_smtp_invitation(client, db_session, fake)
    start = datetime.now(timezone.utc)

    attempt_one = process_outreach_queue(db_session, sender, start)
    too_early = process_outreach_queue(db_session, sender, start + timedelta(seconds=10))
    attempt_two = process_outreach_queue(db_session, sender, start + timedelta(seconds=31))
    attempt_three = process_outreach_queue(db_session, sender, start + timedelta(seconds=31 + 121))
    after_cap = process_outreach_queue(db_session, sender, start + timedelta(days=1))

    assert attempt_one.retry_scheduled == attempt_two.retry_scheduled == 1
    assert too_early.attempted == 0
    assert attempt_three.failed == 1
    assert after_cap.attempted == 0
    assert fake.connections == 3
    invitation = db_session.scalar(select(Invitation))
    assert invitation is not None
    assert invitation.state == "failed"
    assert invitation.attempt_count == 3
    assert (invitation.failure_reason or "").startswith("Gave up after 3 attempts")


def test_connection_lost_mid_send_is_not_retried(client, db_session) -> None:
    class DropsDuringData(FakeSmtp):
        def send_message(self, msg: EmailMessage, to_addrs: list[str]) -> dict:
            raise smtplib.SMTPServerDisconnected("lost during DATA")

    fake = DropsDuringData()
    _, sender = _queued_smtp_invitation(client, db_session, fake)

    summary = process_outreach_queue(db_session, sender, datetime.now(timezone.utc))

    assert summary.failed == 1
    assert summary.retry_scheduled == 0
    assert "delivery is unknown" in (db_session.scalar(select(Invitation.failure_reason)) or "")


def test_an_invitation_left_sending_by_a_crash_is_never_picked_up(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    candidate_id = candidates_by_name(client, listing.id)["Bay Clean Professional Services"]["id"]
    settings = get_settings()
    sender = get_outreach_sender(settings)
    previewed = build_invitation_preview(listing.id, [candidate_id], OWNER_ID, db_session, settings, sender)
    approve_invitations(listing.id, [candidate_id], previewed.message_hash, OWNER_ID, db_session, settings, sender)
    # Simulate a worker that claimed the invitation and died before recording the outcome.
    db_session.execute(update(Invitation).values(state="sending", attempt_count=1))
    db_session.commit()

    summary = process_outreach_queue(db_session, sender, datetime.now(timezone.utc) + timedelta(days=1))

    assert summary.attempted == 0
    assert db_session.scalar(select(Invitation.state)) == "sending"
    assert db_session.scalar(select(func.count()).select_from(SandboxOutboxMessage)) == 0
