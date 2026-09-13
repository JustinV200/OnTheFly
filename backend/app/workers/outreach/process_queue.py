"""Processes queued invitations through a delivery channel, at most one send per invitation.
Each invitation is claimed atomically (queued -> sending) and committed before the send, so double runs are no-ops.
"""

from datetime import datetime, timezone
import json

from pydantic import BaseModel
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.core.invitation_state import InvitationState
from app.core.timestamps import as_utc
from app.models.account import Account
from app.models.listing import PublicListingRecord
from app.models.outreach.invitation import Invitation
from app.models.outreach.invitation_approval import InvitationApproval
from app.services.listings.owned_listing import listing_is_public
from app.services.listings.projection import projection_from_record
from app.services.outreach import OutgoingMessage, OutreachSender, SendResult, is_suppressed
from app.services.outreach.templates.listing_terms import listing_terms_hash
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

    stale_reason = _stale_reason(invitation, listing, db, now)
    if stale_reason is not None:
        # The approved words no longer match the listing, or offers have closed: never send them. One invitation per
        # provider per listing still holds, so the owner shares the listing link by hand if it should still go out.
        if _transition_from_queued(invitation.id, db, state=InvitationState.failed.value, failure_reason=stale_reason, updated_at=now):
            summary.failed += 1
        else:
            summary.skipped += 1
        db.commit()
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


def _stale_reason(invitation: Invitation, listing: PublicListingRecord, db: Session, now: datetime) -> str | None:
    if listing.challenge_deadline is not None and as_utc(listing.challenge_deadline) <= now:
        return "Not sent: the listing's offer deadline passed before it could be sent"
    approval = db.get(InvitationApproval, invitation.approval_id)
    owner = db.get(Account, listing.owner_account_id)
    if approval is None or owner is None:
        return "Not sent: the approval or the listing owner could not be found"
    current = listing_terms_hash(projection_from_record(listing), owner.business_name, owner.handle)
    if current != approval.listing_terms_hash:
        return "Not sent: the listing changed after you approved this invitation, so the email no longer matched it"
    return None


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
        # Stamped at acceptance, not when the pass started: attribution counts only bids made after the send.
        # `now` still wins when a caller passes a later time (tests simulating the future).
        invitation.sent_at = max(now, datetime.now(timezone.utc))
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
