"""Processes queued invitations through a delivery channel, at most one send per invitation.
Each invitation is claimed atomically (queued -> sending) and committed before the send, so double runs are no-ops.
"""

from datetime import datetime
import json

from pydantic import BaseModel
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.core.invitation_state import InvitationState
from app.models.listing import PublicListingRecord
from app.models.outreach.invitation import Invitation
from app.services.listings.owned_listing import listing_is_public
from app.services.outreach import OutgoingMessage, OutreachSender, SendResult, is_suppressed
from app.workers.outreach.backoff import MAX_ATTEMPTS, retry_delay


class QueueRunSummary(BaseModel):
    """What one pass over the queue did."""

    attempted: int = 0
    sent: int = 0
    retry_scheduled: int = 0
    failed: int = 0
    suppressed: int = 0
    # Left queued without a send: another worker claimed it, the channel changed since approval, or
    # the listing is no longer public.
    skipped: int = 0


def process_outreach_queue(
    db: Session,
    sender: OutreachSender,
    now: datetime,
    listing_id: str | None = None,
) -> QueueRunSummary:
    """Send every due queued invitation (optionally for one listing) and return the counts.

    Never touches `sent`, `failed`, `suppressed`, or `sending`. An invitation left in `sending` by a
    crash mid-send is never retried automatically: the channel may already have delivered it, and a
    second delivery is the failure this queue exists to prevent. It stays visible for a human.
    `now` must be timezone-aware UTC.
    """

    query = select(Invitation.id).where(
        Invitation.state == InvitationState.queued.value,
        or_(Invitation.next_attempt_at.is_(None), Invitation.next_attempt_at <= now),
    )
    if listing_id is not None:
        query = query.where(Invitation.listing_id == listing_id)
    due_ids = list(db.scalars(query.order_by(Invitation.created_at, Invitation.id)).all())

    summary = QueueRunSummary()
    for invitation_id in due_ids:
        _process_one(invitation_id, db, sender, now, summary)
    return summary


def _process_one(invitation_id: str, db: Session, sender: OutreachSender, now: datetime, summary: QueueRunSummary) -> None:
    invitation = db.get(Invitation, invitation_id)
    if invitation is None or invitation.state != InvitationState.queued.value:
        summary.skipped += 1
        return
    listing = db.get(PublicListingRecord, invitation.listing_id)
    # The owner approved a specific channel; a config change must not reroute it (e.g. sandbox -> smtp).
    # An unpublished listing would turn the link into a dead page, so the send waits for republishing.
    if invitation.channel != sender.name or listing is None or not listing_is_public(listing):
        summary.skipped += 1
        return

    if is_suppressed(invitation.recipient_email, db):
        if _transition_from_queued(invitation.id, db, state=InvitationState.suppressed.value, updated_at=now):
            summary.suppressed += 1
        else:
            summary.skipped += 1
        db.commit()
        return

    claimed = _transition_from_queued(
        invitation.id,
        db,
        state=InvitationState.sending.value,
        attempt_count=Invitation.attempt_count + 1,
        last_attempt_at=now,
        next_attempt_at=None,
        updated_at=now,
    )
    # Committed before the send: if the process dies mid-send, the row says `sending`, not `queued`.
    db.commit()
    if not claimed:
        summary.skipped += 1
        return

    db.refresh(invitation)
    summary.attempted += 1
    message = OutgoingMessage(
        invitation_id=invitation.id,
        to_email=invitation.recipient_email,
        to_name=invitation.recipient_name,
        subject=invitation.subject,
        body_text=invitation.body_text,
        headers=json.loads(invitation.headers_json),
    )
    result = sender.send(message, f"{invitation.listing_id}:{invitation.provider_candidate_id}", db)
    _record_outcome(invitation, result, now, summary)
    db.commit()


def _transition_from_queued(invitation_id: str, db: Session, **values: object) -> bool:
    # A conditional UPDATE is the claim: only one caller can move a row out of `queued`.
    result = db.execute(
        update(Invitation)
        .where(Invitation.id == invitation_id, Invitation.state == InvitationState.queued.value)
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    return result.rowcount == 1


def _record_outcome(invitation: Invitation, result: SendResult, now: datetime, summary: QueueRunSummary) -> None:
    invitation.updated_at = now
    if result.outcome == "accepted":
        invitation.state = InvitationState.sent.value
        invitation.sent_at = now
        invitation.provider_message_id = result.provider_message_id
        invitation.failure_reason = None
        summary.sent += 1
        return

    invitation.failure_reason = result.detail or "The channel reported a failure without detail"
    if result.outcome == "transient_failure" and invitation.attempt_count < MAX_ATTEMPTS:
        invitation.state = InvitationState.queued.value
        invitation.next_attempt_at = now + retry_delay(invitation.attempt_count)
        summary.retry_scheduled += 1
        return

    invitation.state = InvitationState.failed.value
    if result.outcome == "transient_failure":
        invitation.failure_reason = f"Gave up after {invitation.attempt_count} attempts: {invitation.failure_reason}"
    summary.failed += 1
