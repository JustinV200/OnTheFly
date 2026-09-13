"""Describes the active delivery channel for the owner's approval screen and the demo seams chip."""

from pydantic import BaseModel

from app.services.outreach.senders.base import OutreachSender


class ChannelInfo(BaseModel):
    """What the owner must know about where approved invitations go."""

    name: str
    label: str
    delivers_real_email: bool
    tracks_delivery: bool


def describe_channel(sender: OutreachSender) -> ChannelInfo:
    """Return the channel facts for a sender, read from the sender itself so the label can't drift."""

    return ChannelInfo(
        name=sender.name,
        label=sender.label,
        delivers_real_email=sender.delivers_real_email,
        tracks_delivery=sender.tracks_delivery,
    )
