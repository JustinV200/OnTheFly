"""Invitation delivery channels behind one interface: the sandbox outbox (default) and allowlisted SMTP."""

from app.services.outreach.senders.base import OutgoingMessage, OutreachSender, SendOutcome, SendResult
from app.services.outreach.senders.channel import ChannelInfo, describe_channel
from app.services.outreach.senders.factory import get_outreach_sender

__all__ = [
    "ChannelInfo",
    "OutgoingMessage",
    "OutreachSender",
    "SendOutcome",
    "SendResult",
    "describe_channel",
    "get_outreach_sender",
]
