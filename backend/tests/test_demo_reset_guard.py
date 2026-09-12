"""Checks that the demo reset never drops the database after failing to read its genuine offers.
A transient database error during the capture must stop the command, not read as "nothing to keep".
"""

from collections.abc import Callable
import json
from pathlib import Path
import sqlite3
from typing import Any

import pytest
from sqlalchemy import Engine, event, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.cli import seed_demo
from app.cli.demo_seed import CaptureResult, GenuineOfferLedger, capture_genuine_offers, seed_scenario
from app.cli.demo_seed.ledger import LedgerEntry
from app.db.base import Base
from app.db.session import get_engine, get_session_factory
from app.models.challenge import Challenge

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


def _store_genuine_offer(db_session: Session) -> None:
    # The staged scenario restores the entry as a real row, the state a reset has to protect.
    seed_scenario("staged", GenuineOfferLedger(entries=[_genuine_entry()]), "fixture", db_session)
    db_session.close()


def _genuine_offer_count(db_session: Session) -> int:
    return len(db_session.scalars(select(Challenge).where(Challenge.challenger_account_id == GENUINE_ACCOUNT_ID)).all())


def _lock_first_challenge_read(engine: Engine) -> Callable[..., None]:
    """Make the next SELECT from challenges fail the way a held SQLite lock or dropped connection does."""

    is_armed = [True]

    def fail_once(_conn: Any, _cursor: Any, statement: str, parameters: Any, _context: Any, _many: bool) -> None:
        # Only the capture's read is failed, so an unguarded reset would go on to drop and reseed.
        if is_armed[0] and statement.lstrip().upper().startswith("SELECT") and "FROM challenges" in statement:
            is_armed[0] = False
            raise OperationalError(statement, parameters, sqlite3.OperationalError("database is locked"))

    event.listen(engine, "before_cursor_execute", fail_once)
    return fail_once


def test_reset_aborts_without_dropping_when_the_capture_read_fails(db_session, tmp_path: Path, capsys) -> None:
    _store_genuine_offer(db_session)
    ledger_path = tmp_path / "ledger.json"
    engine = get_engine()
    listener = _lock_first_challenge_read(engine)

    try:
        exit_code = seed_demo.main(["--scenario", "live", "--ledger", str(ledger_path)])
    finally:
        event.remove(engine, "before_cursor_execute", listener)

    assert exit_code != 0
    assert "database is locked" in capsys.readouterr().err
    assert _genuine_offer_count(db_session) == 1
    # Stopping before the ledger save keeps a failed read from ever being written down as "no offers".
    assert not ledger_path.exists()


def test_capture_lets_a_database_error_propagate_when_the_table_exists(db_session) -> None:
    _store_genuine_offer(db_session)
    engine = get_engine()
    listener = _lock_first_challenge_read(engine)
    session = get_session_factory()()

    try:
        with pytest.raises(OperationalError):
            capture_genuine_offers(session, GenuineOfferLedger())
    finally:
        session.close()
        event.remove(engine, "before_cursor_execute", listener)


def test_capture_reports_schema_missing_only_when_the_table_is_absent() -> None:
    session = get_session_factory()()
    try:
        capture = capture_genuine_offers(session, GenuineOfferLedger())
    finally:
        session.close()

    assert capture.schema_missing is True
    assert capture.entries == []


def test_reset_refuses_to_drop_when_schema_missing_is_reported_but_the_table_exists(
    db_session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys
) -> None:
    _store_genuine_offer(db_session)
    dropped: list[Engine] = []
    monkeypatch.setattr(
        seed_demo,
        "capture_genuine_offers",
        lambda _db, _existing: CaptureResult(entries=[], skipped_seeded_account_offers=0, schema_missing=True),
    )
    monkeypatch.setattr(seed_demo, "reset_schema", dropped.append)

    exit_code = seed_demo.main(["--scenario", "live", "--ledger", str(tmp_path / "ledger.json")])

    assert exit_code != 0
    assert dropped == []
    assert "challenges table exists" in capsys.readouterr().err
    assert _genuine_offer_count(db_session) == 1


def test_first_run_reset_proceeds_and_reports_the_missing_schema(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys
) -> None:
    # Stand in for the Alembic rebuild so the test stays fast; the guard under test runs before it.
    monkeypatch.setattr(seed_demo, "reset_schema", lambda engine: Base.metadata.create_all(bind=engine))

    exit_code = seed_demo.main(["--scenario", "live", "--ledger", str(tmp_path / "ledger.json")])

    assert exit_code == 0
    summary = json.loads(capsys.readouterr().out)
    assert summary["schema_missing_before_reset"] is True
    assert summary["captured_before_reset"] == 0
