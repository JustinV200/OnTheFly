"""Reads and writes the durable ledger of genuine counteroffers that a demo reset must never lose.
The ledger is a JSON file outside the database, so a reset that fails halfway still leaves it intact.
"""

from datetime import datetime, timezone
import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.cadence import MONTHLY_FACTORS


class LedgerAccount(BaseModel):
    """The real business behind a genuine offer, restored as a platform account."""

    id: str
    handle: str
    business_name: str
    service_area: str
    created_at: datetime


class LedgerOffer(BaseModel):
    """One genuine offer's terms, exactly as received, with its original timestamps."""

    provenance: Literal["challenger_submitted", "captured_off_platform"]
    bidding_mode_at_submission: Literal["sealed", "open"]
    price_minor: int
    price_currency: str = "USD"
    billing_frequency: str
    scope_included: list[str] = Field(default_factory=list)
    scope_excluded: list[str] = Field(default_factory=list)
    scope_extras: list[str] = Field(default_factory=list)
    setup_fee_minor: int = 0
    taxes_included: bool | None = None
    supplies_included: bool | None = None
    minimum_term: str | None = None
    other_conditions: str | None = None
    message_to_owner: str | None = None
    availability: str | None = None
    offer_expiry: datetime | None = None
    site_visit_required: bool = False
    submitted_at: datetime
    revised_at: datetime | None = None

    @field_validator("billing_frequency")
    @classmethod
    def _frequency_is_comparable(cls, value: str) -> str:
        # Comparison normalizes every offer to monthly; an unconvertible frequency can't be ranked.
        if value.strip().casefold() not in MONTHLY_FACTORS:
            raise ValueError(f"billing_frequency must be one of {sorted(MONTHLY_FACTORS)}")
        return value.strip().casefold()

    @field_validator("submitted_at", "revised_at", "offer_expiry")
    @classmethod
    def _as_utc(cls, value: datetime | None) -> datetime | None:
        # SQLite drops tzinfo on read; stored times are UTC, so re-attach it rather than guess.
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    @model_validator(mode="after")
    def _off_platform_was_never_shown_open_terms(self) -> "LedgerOffer":
        # A quote captured by email or phone never saw this listing's bidding terms, so it can
        # only be sealed; restoring it as open would publish a price its author never agreed to.
        if self.provenance == "captured_off_platform" and self.bidding_mode_at_submission != "sealed":
            raise ValueError("captured_off_platform offers must have bidding_mode_at_submission 'sealed'")
        return self


class LedgerEntry(BaseModel):
    """A genuine offer plus the business that made it and where its original evidence is kept."""

    account: LedgerAccount
    offer: LedgerOffer
    # Where the original message lives (roadmap 01, step 7). Required for off-platform quotes,
    # because a hand-typed quote with no original is indistinguishable from a fake one.
    original_evidence: str | None = None

    @model_validator(mode="after")
    def _off_platform_needs_evidence(self) -> "LedgerEntry":
        if self.offer.provenance == "captured_off_platform" and not (self.original_evidence or "").strip():
            raise ValueError("captured_off_platform entries must say where the original message is kept")
        return self

    @property
    def key(self) -> str:
        """Stable identity across resets; see ledger_key."""

        return ledger_key(self.account.id, self.offer.submitted_at)


def ledger_key(account_id: str, submitted_at: datetime) -> str:
    """The same business's offer submitted at the same instant is the same offer, across resets.

    Revisions keep submitted_at, so a revised offer replaces its earlier ledger copy.
    """

    return f"{account_id}@{submitted_at.isoformat()}"


class GenuineOfferLedger(BaseModel):
    """The whole ledger file."""

    version: Literal[1] = 1
    entries: list[LedgerEntry] = Field(default_factory=list)


def load_ledger(path: Path) -> GenuineOfferLedger:
    """Return the ledger at path, or an empty ledger when the file doesn't exist yet.

    A file that exists but fails validation raises: silently treating it as empty would let
    the next save overwrite the only copy of a genuine offer.
    """

    if not path.exists():
        return GenuineOfferLedger()
    return GenuineOfferLedger.model_validate_json(path.read_text(encoding="utf-8"))


def merge_entries(existing: list[LedgerEntry], captured: list[LedgerEntry]) -> list[LedgerEntry]:
    """Merge freshly captured entries into the ledger; a capture wins, since it holds the latest revision.

    Evidence notes live only in the ledger (the database has no column for them), so an existing
    note is carried onto the captured copy of the same offer.
    """

    merged = {entry.key: entry for entry in existing}
    for entry in captured:
        previous = merged.get(entry.key)
        if previous is not None and entry.original_evidence is None:
            entry = entry.model_copy(update={"original_evidence": previous.original_evidence})
        merged[entry.key] = entry
    return sorted(merged.values(), key=lambda entry: entry.offer.submitted_at)


def save_ledger(path: Path, ledger: GenuineOfferLedger) -> None:
    """Write the ledger atomically: a crash mid-write leaves the previous file, never a truncated one."""

    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(ledger.model_dump_json(indent=2), encoding="utf-8")
    os.replace(temporary, path)
