"""Lists what the sandbox channel captured for one listing, so the owner can read exactly what "was sent".
Owner-only, like the invitations themselves. The captured copy keeps the recipient's opt-out token; this view redacts it.
"""

from datetime import datetime
import json

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.timestamps import as_utc
from app.models.outreach.invitation import Invitation
from app.models.outreach.sandbox_outbox import SandboxOutboxMessage
from app.services.listings.owned_listing import get_owned_listing
from app.services.outreach.templates.redact import redact_header_tokens, redact_opt_out_tokens


class SandboxOutboxMessageView(BaseModel):
    """One captured message, with the invitation it belongs to."""

    id: str
    invitation_id: str
    provider_candidate_id: str
    to_email: str
    subject: str
    body_text: str
    headers: dict[str, str]
    stored_at: datetime


def list_sandbox_outbox(listing_id: str, acting_account_id: str, db: Session) -> list[SandboxOutboxMessageView]:
    """Return the listing's sandbox outbox messages, newest first; raise 404 unless the account owns the listing."""

    listing = get_owned_listing(listing_id, acting_account_id, db)
    rows = db.execute(
        select(SandboxOutboxMessage, Invitation.provider_candidate_id)
        .join(Invitation, Invitation.id == SandboxOutboxMessage.invitation_id)
        .where(Invitation.listing_id == listing.id)
        .order_by(SandboxOutboxMessage.stored_at.desc(), SandboxOutboxMessage.id)
    ).all()
    return [
        SandboxOutboxMessageView(
            id=message.id,
            invitation_id=message.invitation_id,
            provider_candidate_id=provider_candidate_id,
            to_email=message.to_email,
            subject=message.subject,
            body_text=redact_opt_out_tokens(message.body_text),
            headers=redact_header_tokens(json.loads(message.headers_json)),
            stored_at=as_utc(message.stored_at),
        )
        for message, provider_candidate_id in rows
    ]
