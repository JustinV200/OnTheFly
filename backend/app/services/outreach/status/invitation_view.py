"""The owner-facing shape of an invitation: its stored delivery state plus the attributed "challenged" display state."""

from datetime import datetime
import json

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.timestamps import as_utc
from app.models.outreach.invitation import Invitation
from app.services.outreach.status.attribution import find_challenged_at

CHALLENGED_DISPLAY_STATE = "challenged"


class InvitationView(BaseModel):
    """One invitation as the owner's status list shows it."""

    id: str
    listing_id: str
    provider_candidate_id: str
    approval_id: str
    recipient_name: str
    recipient_email: str
    subject: str
    body_text: str
    headers: dict[str, str]
    channel: str
    # queued | sending | sent | failed | suppressed
    state: str
    # The state, or "challenged" once the invited account challenged after the send.
    display_state: str
    attempt_count: int
    last_attempt_at: datetime | None
    next_attempt_at: datetime | None
    sent_at: datetime | None
    failure_reason: str | None
    provider_message_id: str | None
    challenged_at: datetime | None
    created_at: datetime
    updated_at: datetime


def list_invitation_views(listing_id: str, db: Session, invitation_ids: list[str] | None = None) -> list[InvitationView]:
    """Return the listing's invitations oldest first, optionally only the given ids, with attribution applied.

    Assumes the caller already checked the acting account owns the listing.
    """

    query = select(Invitation).where(Invitation.listing_id == listing_id)
    if invitation_ids is not None:
        query = query.where(Invitation.id.in_(invitation_ids))
    invitations = list(db.scalars(query.order_by(Invitation.created_at, Invitation.id)).all())
    challenged_at = find_challenged_at(listing_id, invitations, db)
    return [_view(invitation, challenged_at.get(invitation.id)) for invitation in invitations]


def _view(invitation: Invitation, challenged_at: datetime | None) -> InvitationView:
    return InvitationView(
        id=invitation.id,
        listing_id=invitation.listing_id,
        provider_candidate_id=invitation.provider_candidate_id,
        approval_id=invitation.approval_id,
        recipient_name=invitation.recipient_name,
        recipient_email=invitation.recipient_email,
        subject=invitation.subject,
        body_text=invitation.body_text,
        headers=json.loads(invitation.headers_json),
        channel=invitation.channel,
        state=invitation.state,
        display_state=CHALLENGED_DISPLAY_STATE if challenged_at is not None else invitation.state,
        attempt_count=invitation.attempt_count,
        last_attempt_at=_utc_or_none(invitation.last_attempt_at),
        next_attempt_at=_utc_or_none(invitation.next_attempt_at),
        sent_at=_utc_or_none(invitation.sent_at),
        failure_reason=invitation.failure_reason,
        provider_message_id=invitation.provider_message_id,
        challenged_at=challenged_at,
        created_at=as_utc(invitation.created_at),
        updated_at=as_utc(invitation.updated_at),
    )


def _utc_or_none(value: datetime | None) -> datetime | None:
    return as_utc(value) if value is not None else None
