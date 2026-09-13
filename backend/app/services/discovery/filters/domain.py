"""Reduces a URL or host to its registrable domain, the key aggregator filtering and deduplication compare.
Deliberate scope cut: a short list of two-label public suffixes stands in for the full Public Suffix List.
"""

from urllib.parse import urlsplit

# Common country suffixes where the registrable domain is three labels (example.co.uk). Anything not
# listed is treated as a one-label suffix, which is right for the .com/.org/.net results US searches return.
_TWO_LABEL_SUFFIXES = frozenset(
    {"co.uk", "org.uk", "ac.uk", "com.au", "net.au", "org.au", "co.nz", "co.jp", "com.br", "co.in", "com.mx", "co.za"}
)


def registrable_domain(url_or_host: str | None) -> str | None:
    """Return e.g. "bayclean.example" for "https://www.bayclean.example/contact"; None when there is no host."""

    if not url_or_host or not url_or_host.strip():
        return None
    candidate = url_or_host.strip()
    if "://" not in candidate:
        candidate = f"https://{candidate}"
    try:
        host = urlsplit(candidate).hostname
    except ValueError:
        # A malformed URL (bad port, broken IPv6 literal) has no trustworthy host to key on.
        return None
    if not host:
        return None

    labels = [label for label in host.casefold().rstrip(".").split(".") if label]
    if len(labels) < 2:
        return ".".join(labels) or None
    if len(labels) >= 3 and ".".join(labels[-2:]) in _TWO_LABEL_SUFFIXES:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])
