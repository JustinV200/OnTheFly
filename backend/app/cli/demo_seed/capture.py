"""Captures genuine counteroffers from the current database before a reset destroys it.
Offers from seeded demo accounts are skipped: those businesses are fictional, whatever their stored label says.
"""

from datetime import date, datetime, timezone
import json

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.cli.demo_seed.ledger import GenuineOfferLedger, LedgerAccount, LedgerEntry, LedgerOffer, ledger_key
from app.models.account import Account
from app.models.challenge import Challenge
from app.services.challenges.provenance import SEEDED_ACCOUNT_IDS
from app.services.demo.status import GENUINE_OFFER_PROVENANCES


class CaptureResult(BaseModel):
    """Entries captured, plus offers deliberately left out and why."""

    entries: list[LedgerEntry]
    skipped_seeded_account_offers: int
    schema_missing: bool


def capture_genuine_offers(db: Session, existing: GenuineOfferLedger) -> CaptureResult:
    """Return ledger entries for every active genuine offer currently stored.

    The database has no evidence column, so each entry takes its original_evidence note from the
    existing ledger. An offer the ledger has never seen gets an explicit "not recorded" note
    rather than failing the capture, since failing would block the reset that protects it.
    A database with no schema yet (first run) captures nothing and says so.
    """

    evidence_by_key = {entry.key: entry.original_evidence for entry in existing.entries}

    try:
        challenges = db.scalars(
            select(Challenge)
            .where(Challenge.provenance.in_(GENUINE_OFFER_PROVENANCES))
            .where(Challenge.is_active.is_(True))
        ).all()
    except (OperationalError, ProgrammingError):
        db.rollback()
        return CaptureResult(entries=[], skipped_seeded_account_offers=0, schema_missing=True)

    entries: list[LedgerEntry] = []
    skipped = 0
    for challenge in challenges:
        # Before provenance was server-resolved, the challenge form defaulted every offer to
        # challenger_submitted, so a rehearsal could leave a seeded account's offer labeled genuine.
        if challenge.challenger_account_id in SEEDED_ACCOUNT_IDS:
            skipped += 1
            continue
        account = db.get(Account, challenge.challenger_account_id)
        if account is None:
            continue
        entries.append(_entry_from(challenge, account, evidence_by_key))
    return CaptureResult(entries=entries, skipped_seeded_account_offers=skipped, schema_missing=False)


def _entry_from(challenge: Challenge, account: Account, evidence_by_key: dict[str, str | None]) -> LedgerEntry:
    offer = _offer_from(challenge)
    evidence = evidence_by_key.get(ledger_key(account.id, offer.submitted_at)) or (
        f"NOT RECORDED: captured from the database on {date.today().isoformat()}; "
        "add where the original message is kept"
    )
    return LedgerEntry(
        account=LedgerAccount(
            id=account.id,
            handle=account.handle,
            business_name=account.business_name,
            service_area=account.service_area,
            created_at=_as_utc(account.created_at),
        ),
        offer=offer,
        original_evidence=evidence,
    )


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes for timezone-aware columns; every stored time is UTC.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _offer_from(challenge: Challenge) -> LedgerOffer:
    # LedgerOffer re-attaches UTC to naive times, so the key built from submitted_at is stable.
    return LedgerOffer(
        provenance=challenge.provenance,
        bidding_mode_at_submission=challenge.bidding_mode_at_submission,
        price_minor=challenge.price_minor,
        price_currency=challenge.price_currency,
        billing_frequency=challenge.billing_frequency,
        scope_included=json.loads(challenge.scope_included),
        scope_excluded=json.loads(challenge.scope_excluded),
        scope_extras=json.loads(challenge.scope_extras),
        setup_fee_minor=challenge.setup_fee_minor,
        taxes_included=challenge.taxes_included,
        supplies_included=challenge.supplies_included,
        minimum_term=challenge.minimum_term,
        other_conditions=challenge.other_conditions,
        message_to_owner=challenge.message_to_owner,
        availability=challenge.availability,
        offer_expiry=challenge.offer_expiry,
        site_visit_required=challenge.site_visit_required,
        submitted_at=challenge.submitted_at,
        revised_at=challenge.revised_at,
    )
