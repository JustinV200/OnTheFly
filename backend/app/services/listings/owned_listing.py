"""Loads a listing for its owner, and guards features that may only act on a live public listing.
Anyone but the owner gets 404, so another account can't even learn the listing exists.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.visibility import ListingVisibility, is_public
from app.models.listing import PublicListingRecord


def get_owned_listing(listing_id: str, acting_account_id: str, db: Session) -> PublicListingRecord:
    """Return the listing when the acting account owns it; raise 404 otherwise."""

    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == acting_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


def listing_is_public(listing: PublicListingRecord) -> bool:
    """Return True only for an explicitly public listing; any unknown stored value reads as not public."""

    try:
        return is_public(ListingVisibility(listing.visibility))
    except ValueError:
        return False


def require_public_listing(listing: PublicListingRecord, action: str) -> None:
    """Raise 400 unless the listing is public, naming the action that was refused.

    Discovery queries and invitations are built from the public projection and link to the
    live public page, so neither may run while the listing is private or closed.
    """

    if not listing_is_public(listing):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Listing is not public: {action} only runs for a published listing. Publish it first.",
        )
