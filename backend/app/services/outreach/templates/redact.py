"""Hides each recipient's opt-out token from every owner-facing view of an invitation (preview, status, outbox).
The token is a capability: whoever holds it can opt that address out of all businesses' invitations, so only the copy
that goes to the recipient carries it. The owner still sees the exact message, with the link's place marked.
"""

import re

OPT_OUT_TOKEN_PLACEHOLDER = "[private-link-for-the-recipient]"
# The token is the path segment after /opt-out/; it ends at whitespace or the ">" closing a List-Unsubscribe header.
_OPT_OUT_TOKEN = re.compile(r"(/opt-out/)[^\s>]+")


def redact_opt_out_tokens(text: str) -> str:
    """Replace every opt-out token in text with a visible placeholder."""

    return _OPT_OUT_TOKEN.sub(lambda match: f"{match.group(1)}{OPT_OUT_TOKEN_PLACEHOLDER}", text)


def redact_header_tokens(headers: dict[str, str]) -> dict[str, str]:
    """Return a copy of the headers with opt-out tokens replaced (List-Unsubscribe carries one)."""

    return {name: redact_opt_out_tokens(value) for name, value in headers.items()}
