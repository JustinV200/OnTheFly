"""One command that resets the demo to a known state without losing a genuine counteroffer (roadmap 09, "Demo reset command").

    python -m app.cli.seed_demo                      # live: everything private, perform the script
    python -m app.cli.seed_demo --scenario staged    # listing public with offers, rehearse or recover

Order matters: a transaction source the seed can't import from (anything but fixture) stops the
command before it reads the database, genuine offers are written to the ledger file before anything
is dropped, and a capture that fails or can't account for the challenges table stops it before the drop.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

from app.cli.demo_seed import (
    BACKEND_DIR,
    GenuineOfferLedger,
    MissingDemoConnectionError,
    capture_genuine_offers,
    challenges_table_exists,
    load_ledger,
    merge_entries,
    require_demo_connections,
    reset_schema,
    save_ledger,
    seed_scenario,
)
from app.core.config import get_settings
from app.db.session import get_engine, get_session_factory

# Gitignored (it can hold a real business's commercial terms), and outside the database so a
# reset that crashes after the drop still leaves every genuine offer on disk.
DEFAULT_LEDGER_PATH = BACKEND_DIR / "demo_data" / "genuine_counteroffers.json"


def main(argv: list[str] | None = None) -> int:
    """Capture genuine offers, reset the schema, seed the chosen scenario, and print a summary."""

    args = _parse_args(argv)
    settings = get_settings()
    database_url = make_url(settings.database_url)
    if database_url.get_backend_name() != "sqlite" and not args.confirm_remote:
        # A deployed database is shared by everyone watching the demo; wiping it takes intent.
        print(
            f"Refusing to reset non-local database {database_url.render_as_string(hide_password=True)} "
            "without --confirm-remote.",
            file=sys.stderr,
        )
        return 2

    try:
        require_demo_connections(settings.transaction_source)
    except MissingDemoConnectionError as error:
        # The seed would only discover this after the drop; checking now leaves the database untouched.
        print(f"Refusing to reset: {error} Nothing was read, saved, or dropped.", file=sys.stderr)
        return 2

    existing_ledger = load_ledger(args.ledger)
    session = get_session_factory()()
    try:
        capture = capture_genuine_offers(session, existing_ledger)
    except SQLAlchemyError as error:
        # Nothing is saved or dropped yet, so stopping here is the safe outcome. A lock, a dropped
        # connection, or a timeout must never pass for "no genuine offers to keep".
        print(f"Refusing to reset: reading genuine offers failed, nothing was dropped. {error}", file=sys.stderr)
        return 1
    finally:
        session.close()
    ledger = GenuineOfferLedger(entries=merge_entries(existing_ledger.entries, capture.entries))
    save_ledger(args.ledger, ledger)

    engine = get_engine()
    if capture.schema_missing and challenges_table_exists(engine):
        # The capture saw no schema, yet the table is here now, so any offers in it never reached
        # the ledger. Dropping would destroy them.
        print(
            "Refusing to reset: the capture reported no schema but the challenges table exists; "
            "nothing was dropped. Rerun once nothing else is creating or migrating the database.",
            file=sys.stderr,
        )
        return 1
    reset_schema(engine)

    session = get_session_factory()()
    try:
        summary = seed_scenario(args.scenario, ledger, settings.transaction_source, session)
    finally:
        session.close()

    print(
        json.dumps(
            {
                "database": database_url.render_as_string(hide_password=True),
                "ledger": str(args.ledger),
                "captured_before_reset": len(capture.entries),
                # True only on a first run, when there was no challenges table to capture from.
                "schema_missing_before_reset": capture.schema_missing,
                "skipped_seeded_account_offers": capture.skipped_seeded_account_offers,
                **summary.model_dump(),
            },
            indent=2,
        )
    )
    return 0


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reset demo data to a known state.")
    parser.add_argument(
        "--scenario",
        choices=["live", "staged"],
        default="live",
        help="live: all private, nothing published (default). staged: cleaning listing public with offers.",
    )
    parser.add_argument(
        "--ledger",
        type=Path,
        default=DEFAULT_LEDGER_PATH,
        help=f"Genuine counteroffer ledger file (default: {DEFAULT_LEDGER_PATH}).",
    )
    parser.add_argument(
        "--confirm-remote",
        action="store_true",
        help="Required to reset a non-SQLite (e.g. deployed Postgres) database.",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(main())
