"""Restores genuine counteroffers from the ledger onto the demo listing with their real provenance and times.
Offers are written directly rather than through submit_challenge, which would stamp them "now" and reject past deadlines.
"""

import json

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cli.demo_seed.ledger import GenuineOfferLedger, LedgerEntry
from app.models.account import Account
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.services.challenges.amounts import find_offer_amount_problem
from app.services.challenges.provenance import SEEDED_ACCOUNT_IDS
from app.services.evidence.refresh import get_or_refresh_challenger_evidence


class RestoreResult(BaseModel):
    """Restored challenge ids and the ledger entries that could not be restored, with reasons."""

    challenge_ids: list[str]
    skipped: list[str]


def restore_accounts(ledger: GenuineOfferLedger, db: Session) -> None:
    """Recreate each genuine business's account, keeping its original id and creation time."""

    for entry in ledger.entries:
        if entry.account.id in SEEDED_ACCOUNT_IDS or db.get(Account, entry.account.id) is not None:
            continue
        db.add(Account(**entry.account.model_dump()))
    db.commit()


def restore_genuine_offers(listing: PublicListingRecord, ledger: GenuineOfferLedger, db: Session) -> RestoreResult:
    """Attach every ledger offer to the listing's current scope version and refresh its evidence.

    Assumes the ledger's offers answered this listing's scope, which holds while the demo has one
    real expense (roadmap/notes/real-expense.md). One active offer per business, latest first.
    """

    restored: list[str] = []
    skipped: list[str] = []
    for entry in sorted(ledger.entries, key=lambda item: item.offer.submitted_at, reverse=True):
        reason = _skip_reason(entry, listing, db)
        if reason is not None:
            skipped.append(f"{entry.key}: {reason}")
            continue
        challenge = _challenge_from(entry, listing)
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
        get_or_refresh_challenger_evidence(challenge, db)
        restored.append(challenge.id)
    return RestoreResult(challenge_ids=restored, skipped=skipped)


def _skip_reason(entry: LedgerEntry, listing: PublicListingRecord, db: Session) -> str | None:
    if entry.account.id in SEEDED_ACCOUNT_IDS:
        return "account id collides with a seeded demo account"
    if listing.owner_account_id == entry.account.id:
        return "the listing owner cannot bid on their own listing"
    if db.get(Account, entry.account.id) is None:
        return "account was not restored"
    # Offers are written directly here, so the amount rule submit_challenge enforces is checked again.
    amount_problem = find_offer_amount_problem(entry.offer.price_minor, entry.offer.setup_fee_minor)
    if amount_problem is not None:
        return amount_problem
    existing = db.scalar(
        select(Challenge.id).where(
            Challenge.listing_id == listing.id,
            Challenge.challenger_account_id == entry.account.id,
            Challenge.is_active.is_(True),
        )
    )
    if existing is not None:
        return "a newer offer from this business is already restored"
    return None


def _challenge_from(entry: LedgerEntry, listing: PublicListingRecord) -> Challenge:
    offer = entry.offer
    return Challenge(
        listing_id=listing.id,
        scope_version_id=listing.scope_version_id,
        challenger_account_id=entry.account.id,
        # The mode in force when it was really made, never the listing's mode today.
        bidding_mode_at_submission=offer.bidding_mode_at_submission,
        price_minor=offer.price_minor,
        price_currency=offer.price_currency,
        billing_frequency=offer.billing_frequency,
        scope_included=json.dumps(offer.scope_included),
        scope_excluded=json.dumps(offer.scope_excluded),
        scope_extras=json.dumps(offer.scope_extras),
        setup_fee_minor=offer.setup_fee_minor,
        taxes_included=offer.taxes_included,
        supplies_included=offer.supplies_included,
        minimum_term=offer.minimum_term,
        other_conditions=offer.other_conditions,
        message_to_owner=offer.message_to_owner,
        availability=offer.availability,
        offer_expiry=offer.offer_expiry,
        site_visit_required=offer.site_visit_required,
        provenance=offer.provenance,
        submitted_at=offer.submitted_at,
        revised_at=offer.revised_at,
        is_active=True,
    )
