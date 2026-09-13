"""Hashes the exact batch an owner previewed, so approval can refuse anything that changed since.
Same idea as the listing publish hash (services/listings/visibility.py): an irreversible action must match its preview.
"""

import hashlib
import json

from app.services.outreach.approval.recipients import PreviewMessage
from app.services.outreach.templates.render import TEMPLATE_VERSION


def build_message_hash(channel: str, messages: list[PreviewMessage]) -> str:
    """Return a sha256 over the channel, template version, and every message's recipient, headers, subject, and body.

    Messages are sorted by candidate id, so the hash doesn't depend on selection order.
    """

    payload = {
        "channel": channel,
        "template_version": TEMPLATE_VERSION,
        "messages": [
            message.model_dump(mode="json") for message in sorted(messages, key=lambda item: item.candidate_id)
        ],
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
