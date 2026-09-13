"""The default channel: stores each rendered invitation in the sandbox outbox table instead of emailing it.
Roadmap 08, "Use a sandbox or a whitelist until the approval gate is proven". No email leaves the machine.
"""

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outreach.sandbox_outbox import SandboxOutboxMessage
from app.services.outreach.senders.base import OutgoingMessage, OutreachSender, SendResult


class SandboxSender(OutreachSender):
    """Captures invitations in the database; one outbox row per invitation, ever."""

    name = "sandbox"
    label = "Sandbox outbox — no email leaves this machine"
    delivers_real_email = False
    tracks_delivery = False

    def refusal_reason(self, email: str) -> str | None:
        """The sandbox reaches no inbox, so it can accept any address."""

        return None

    def send(self, message: OutgoingMessage, idempotency_key: str, db: Session) -> SendResult:
        """Stage the outbox row, or report the existing one; never a second copy.

        The unique invitation_id column backs this check, so even a racing duplicate fails at
        commit instead of storing twice. The caller commits the row with the invitation's new state.
        """

        existing = db.scalar(
            select(SandboxOutboxMessage).where(SandboxOutboxMessage.invitation_id == message.invitation_id)
        )
        if existing is not None:
            return SendResult(
                outcome="accepted",
                provider_message_id=f"sandbox-outbox:{existing.id}",
                detail="Already in the sandbox outbox; not stored again",
            )

        row = SandboxOutboxMessage(
            invitation_id=message.invitation_id,
            to_email=message.to_email,
            subject=message.subject,
            body_text=message.body_text,
            headers_json=json.dumps(message.headers),
        )
        db.add(row)
        db.flush()
        return SendResult(outcome="accepted", provider_message_id=f"sandbox-outbox:{row.id}")
