"""Builds the public URLs an invitation points to: the listing, the business profile, and the opt-out page.
The listing link carries no token: an invited provider lands on the same page as everyone else (roadmap 08, "Don't rebuild the private RFQ").
"""

from urllib.parse import quote


def public_listing_url(public_app_base_url: str, listing_id: str) -> str:
    """Return the public listing page URL, e.g. http://localhost:5173/listings/<id>."""

    return f"{public_app_base_url.rstrip('/')}/listings/{quote(listing_id, safe='')}"


def public_profile_url(public_app_base_url: str, handle: str) -> str:
    """Return the business's public profile URL, e.g. http://localhost:5173/p/apex-facilities."""

    return f"{public_app_base_url.rstrip('/')}/p/{quote(handle, safe='')}"


def opt_out_url(public_app_base_url: str, opt_out_token: str) -> str:
    """Return the per-recipient opt-out page URL; the token identifies the address, not a listing flow."""

    return f"{public_app_base_url.rstrip('/')}/opt-out/{quote(opt_out_token, safe='')}"
