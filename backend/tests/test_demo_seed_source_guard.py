"""Checks that the demo reset refuses a transaction source it can't seed before it touches anything.
The seeded demo data is fixture data, so under any other source the command must stop before the drop.
"""

from pathlib import Path

import pytest
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from app.cli import seed_demo
from app.cli.demo_seed import GenuineOfferLedger, LedgerEntry, MissingDemoConnectionError, seed_scenario
from app.core.config import get_settings
from app.core.visibility import ListingVisibility
from app.models.account import Account
from app.models.listing import PublicListingRecord
from app.models.transaction import Transaction

GENUINE_ACCOUNT_ID = "acc_real_1"


def _genuine_entry() -> LedgerEntry:
    return LedgerEntry.model_validate(
        {
            "account": {
                "id": GENUINE_ACCOUNT_ID,
                "handle": "real-cleaner",
                "business_name": "Real Cleaner Co",
                "service_area": "San Francisco, CA",
                "created_at": "2026-09-01T00:00:00Z",
            },
            "offer": {
                "provenance": "captured_off_platform",
                "bidding_mode_at_submission": "sealed",
                "price_minor": 190000,
                "billing_frequency": "monthly",
                "submitted_at": "2026-09-10T15:30:00Z",
            },
            "original_evidence": "email, saved in team drive",
        }
    )


def _use_transaction_source(monkeypatch: pytest.MonkeyPatch, transaction_source: str) -> None:
    # Settings are cached per process, so the new value only takes effect after a cache clear.
    monkeypatch.setenv("TRANSACTION_SOURCE", transaction_source)
    get_settings.cache_clear()


def _transaction_count(db_session: Session) -> int:
    return int(db_session.scalar(select(func.count()).select_from(Transaction)) or 0)


def _public_listing_count(db_session: Session) -> int:
    query = select(func.count()).select_from(PublicListingRecord).where(
        PublicListingRecord.visibility == ListingVisibility.public.value
    )
    return int(db_session.scalar(query) or 0)


def test_reset_under_stripe_exits_before_capture_or_drop(
    db_session: Session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    seed_scenario("staged", GenuineOfferLedger(), "fixture", db_session)
    transactions_before = _transaction_count(db_session)
    public_listings_before = _public_listing_count(db_session)
    ledger_path = tmp_path / "ledger.json"
    dropped: list[Engine] = []
    # Recording instead of dropping keeps the test fast and shows whether the drop was ever reached.
    monkeypatch.setattr(seed_demo, "reset_schema", dropped.append)
    _use_transaction_source(monkeypatch, "stripe")

    exit_code = seed_demo.main(["--scenario", "staged", "--ledger", str(ledger_path)])

    assert exit_code == 2
    assert dropped == []
    error_output = capsys.readouterr().err
    assert "TRANSACTION_SOURCE=fixture" in error_output
    assert "acc_owner_1" in error_output and "acc_owner_2" in error_output
    # Neither the ledger save nor the seed ran, so the database is exactly as it was.
    assert not ledger_path.exists()
    db_session.expire_all()
    assert _transaction_count(db_session) == transactions_before
    assert _public_listing_count(db_session) == public_listings_before


def test_seed_scenario_under_stripe_raises_before_writing_anything(db_session: Session) -> None:
    with pytest.raises(MissingDemoConnectionError, match="TRANSACTION_SOURCE=fixture"):
        seed_scenario("staged", GenuineOfferLedger(entries=[_genuine_entry()]), "stripe", db_session)

    # Restoring ledger accounts is the seed's first committed write, so its absence shows nothing ran.
    db_session.expire_all()
    assert db_session.get(Account, GENUINE_ACCOUNT_ID) is None
    assert _transaction_count(db_session) == 0
    assert _public_listing_count(db_session) == 0
