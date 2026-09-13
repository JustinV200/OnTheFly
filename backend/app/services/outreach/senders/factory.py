"""Chooses the configured invitation delivery channel.
The active channel is controlled centrally by settings.outreach_channel; this is the only place concrete senders are named.
"""

from app.core.config import Settings
from app.services.outreach.senders.base import OutreachSender
from app.services.outreach.senders.sandbox import SandboxSender
from app.services.outreach.senders.smtp import SmtpSender


def get_outreach_sender(settings: Settings) -> OutreachSender:
    """Return the sender named by settings; raise ValueError for an unknown channel."""

    if settings.outreach_channel == "sandbox":
        # Default: invitations are stored in the sandbox outbox and no email leaves the machine.
        return SandboxSender()
    if settings.outreach_channel == "smtp":
        # Real email, but only to OUTREACH_RECIPIENT_ALLOWLIST, and approval is refused until the
        # compliance checks (postal address, real From domain, SMTP host) pass.
        return SmtpSender(settings)
    raise ValueError(f"Unsupported outreach_channel: {settings.outreach_channel}")
