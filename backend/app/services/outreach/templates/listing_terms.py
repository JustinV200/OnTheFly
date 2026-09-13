"""Fingerprints the public listing terms an invitation was rendered from, so a queued invitation can tell whether the
listing still says what the approved email says. Deliberately broad: every projection field except visibility and
publish time, plus the owner's public name and handle, so any change that could make the email wrong stops the send.
"""

import hashlib
import json

from app.services.listings.types import PublicListingProjection

# Changing these never changes the invitation's words; republishing an unchanged listing must not void approvals.
_VOLATILE_FIELDS = {"visibility", "published_at"}


def listing_terms_hash(projection: PublicListingProjection, business_name: str, business_handle: str) -> str:
    """Return a stable hash of the listing's public terms and the owner's public identity."""

    terms = projection.model_dump(mode="json", exclude=_VOLATILE_FIELDS)
    payload = json.dumps({"terms": terms, "business_name": business_name, "business_handle": business_handle}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
