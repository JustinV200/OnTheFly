"""Finds one business's own active offer on a listing, so its author can see and revise it.
The account is part of the query itself, never a filter applied afterwards, so no other challenger's
offer is ever loaded. It stores nothing and knows nothing about HTTP.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.challenge import Challenge


def find_own_active_offer(listing_id: str, challenger_account_id: str, db: Session) -> Challenge | None:
    """Return the account's active offer on the listing, or None when it has none.

    None also covers a listing id that doesn't exist and an owner looking at their own listing
    (owners can't bid), so a caller can't tell those cases apart from "no offer yet".
    """

    return db.scalar(
        select(Challenge).where(
            Challenge.listing_id == listing_id,
            Challenge.challenger_account_id == challenger_account_id,
            Challenge.is_active.is_(True),
        )
    )
