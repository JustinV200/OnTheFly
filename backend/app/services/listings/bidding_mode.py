"""Owns bidding-mode defaults and owner-controlled listing mode changes.
Existing offers keep their original submission mode even after later toggles.
"""

from enum import StrEnum

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import PublicListingRecord


class BiddingMode(StrEnum):
    """Enumerates supported listing bidding modes."""

    sealed = "sealed"
    open = "open"



def resolve_bidding_mode(raw: str | None) -> BiddingMode:
    """Return sealed for missing or ambiguous values and open only explicitly."""

    try:
        return BiddingMode(raw or BiddingMode.sealed.value)
    except ValueError:
        return BiddingMode.sealed



def set_bidding_mode(
    listing_id: str,
    mode: str,
    owner_account_id: str,
    db: Session,
) -> PublicListingRecord:
    """Set the current bidding mode for one owner-owned listing record."""

    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == owner_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    listing.bidding_mode = resolve_bidding_mode(mode).value
    db.commit()
    db.refresh(listing)
    return listing
