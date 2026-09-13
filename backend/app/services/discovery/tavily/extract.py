"""Parses Tavily search hits into provider fields: name from the title, website from the URL, published email from the text.
An email is taken only when it literally appears in the returned content; it is never guessed from a domain.
"""

import re
from urllib.parse import urlsplit

_TITLE_SEPARATORS = re.compile(r"\s+[|\-–—:]\s+")
_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
# "logo@2x.png" matches the email pattern but is an image filename.
_IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico")
# Placeholder and unmonitored addresses are not contact details published for inquiries.
_IGNORED_LOCAL_PARTS = frozenset({"example", "email", "name", "your", "youremail", "user", "test"})
_NO_REPLY = re.compile(r"no-?reply|do-?not-?reply", re.IGNORECASE)
SUMMARY_MAX_CHARS = 400


def business_name_from_title(title: str, url: str) -> str:
    """Return the title's leading segment ("Bay Clean | Office Cleaning" -> "Bay Clean"), or the host when untitled."""

    leading = _TITLE_SEPARATORS.split(title.strip(), maxsplit=1)[0].strip()
    if leading:
        return leading
    host = _host(url)
    return host.removeprefix("www.") if host else url


def website_from_url(url: str) -> str | None:
    """Return scheme://host for a result URL, or None when the URL has no host."""

    host = _host(url)
    if not host:
        return None
    scheme = urlsplit(url).scheme or "https"
    return f"{scheme}://{host}"


def find_published_email(content: str) -> str | None:
    """Return the first plausible inquiry address in the text, lowercased; None when none is published."""

    for match in _EMAIL.finditer(content):
        address = match.group(0).rstrip(".").lower()
        local_part, _, domain = address.partition("@")
        if address.endswith(_IMAGE_SUFFIXES) or local_part in _IGNORED_LOCAL_PARTS:
            continue
        if _NO_REPLY.search(local_part) or domain in {"example.com", "domain.com", "email.com"}:
            continue
        return address
    return None


def summarize_content(content: str) -> str | None:
    """Return the snippet with whitespace collapsed, cut at a word boundary; None when empty."""

    collapsed = " ".join(content.split())
    if not collapsed:
        return None
    if len(collapsed) <= SUMMARY_MAX_CHARS:
        return collapsed
    return collapsed[:SUMMARY_MAX_CHARS].rsplit(" ", 1)[0] + "…"


def _host(url: str) -> str | None:
    try:
        return urlsplit(url).hostname
    except ValueError:
        return None
