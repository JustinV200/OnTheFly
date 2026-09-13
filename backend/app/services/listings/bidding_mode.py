"""Owns bidding-mode defaults and owner-controlled listing mode changes.
Existing offers keep their original submission mode even after later toggles.
Every real mode change is written to the visibility audit trail with the payload it serves.
"""

from enum import StrEnum

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import PublicListingRecord
from app.services.listings.audit import write_visibility_audit
from app.services.listings.projection import projection_from_record

# Mode rows share previous_state/new_state (String(32)) with publication rows; the prefix keeps
# them distinguishable without a migration. The stored mode is String(16), so it always fits.
_AUDIT_STATE_PREFIX = "bidding_mode:"


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
    """Set the current bidding mode for one owner-owned listing record.

    The mode is part of the served public projection and decides whether offer prices are
    public, so each change is audited. Private listings are audited too, because the next
    publish serves the stored mode. Requesting the mode already in force writes nothing.
    """

    listing = db.scalar(
        select(PublicListingRecord).where(
            PublicListingRecord.id == listing_id,
            PublicListingRecord.owner_account_id == owner_account_id,
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    new_mode = resolve_bidding_mode(mode).value
    if listing.bidding_mode == new_mode:
        return listing

    previous_mode = listing.bidding_mode
    listing.bidding_mode = new_mode
    write_visibility_audit(
        expense_id=listing.expense_id,
        account_id=owner_account_id,
        previous_state=f"{_AUDIT_STATE_PREFIX}{previous_mode}",
        new_state=f"{_AUDIT_STATE_PREFIX}{new_mode}",
        # Taken after the assignment so the latest audit row matches what the public API now serves.
        snapshot=projection_from_record(listing).model_dump_json(),
        db=db,
        task_id=listing.task_id,
    )
    db.commit()
    db.refresh(listing)
    return listing
