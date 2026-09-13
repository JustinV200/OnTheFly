"""Declares the invitation delivery interface and the message/result shapes that cross it.
Only senders/factory.py picks a concrete sender; the queue worker depends on this protocol alone.
"""

from typing import Literal, Protocol

from pydantic import BaseModel
from sqlalchemy.orm import Session

# accepted: the channel took the message. transient_failure: worth retrying with backoff.
# permanent_failure: retrying cannot help (or could deliver twice), so the invitation fails visibly.
SendOutcome = Literal["accepted", "transient_failure", "permanent_failure"]


class OutgoingMessage(BaseModel):
    """The exact approved message for one invitation, as stored at approval time."""

    invitation_id: str
    to_email: str
    to_name: str
    subject: str
    body_text: str
    headers: dict[str, str]


class SendResult(BaseModel):
    """What the channel reported for one send attempt."""

    outcome: SendOutcome
    provider_message_id: str | None = None
    detail: str | None = None


class OutreachSender(Protocol):
    """Delivers one approved invitation through a channel."""

    # Stable key stored on approvals and invitations, e.g. "sandbox" or "smtp".
    name: str
    label: str
    # True only when a real inbox can receive the message; the demo seams chip states this.
    delivers_real_email: bool
    # False for every current channel: delivered/opened need provider webhooks, which are not built.
    tracks_delivery: bool

    def refusal_reason(self, email: str) -> str | None:
        """Return why this channel will never send to the address, or None when it may."""

    def send(self, message: OutgoingMessage, idempotency_key: str, db: Session) -> SendResult:
        """Attempt delivery once; the caller owns claiming, retries, and the commit."""
