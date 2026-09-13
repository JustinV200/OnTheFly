"""Owns the delivery states an outbound invitation moves through.
Delivered/opened/bounced are deliberately absent: they need provider webhooks, which are not built.
"""

from enum import StrEnum


class InvitationState(StrEnum):
    """Enumerates the stored lifecycle of one invitation send.

    queued -> sending -> sent, with failed and suppressed as terminal alternatives.
    `sending` is terminal too once a worker crashes mid-send: the outcome is unknown, and
    retrying it could deliver the same invitation twice (roadmap 08, step 7).
    """

    queued = "queued"
    sending = "sending"
    sent = "sent"
    failed = "failed"
    suppressed = "suppressed"
