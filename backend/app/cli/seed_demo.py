"""One command that resets the demo to a known state without losing a genuine counteroffer (roadmap 09, step 3).

    python -m app.cli.seed_demo                      # live: everything private, perform the script
    python -m app.cli.seed_demo --scenario staged    # listing public with offers, rehearse or recover

Order matters: genuine offers are written to the ledger file before anything is dropped.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from sqlalchemy.engine import make_url

from app.cli.demo_seed import (
    BACKEND_DIR,
    GenuineOfferLedger,
    capture_genuine_offers,
    load_ledger,
    merge_entries,
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

    existing_ledger = load_ledger(args.ledger)
    session = get_session_factory()()
    try:
        capture = capture_genuine_offers(session, existing_ledger)
    finally:
        session.close()
    ledger = GenuineOfferLedger(entries=merge_entries(existing_ledger.entries, capture.entries))
    save_ledger(args.ledger, ledger)

    reset_schema(get_engine())

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
