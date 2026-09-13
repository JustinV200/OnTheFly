"""Processes due queued invitations once and prints what happened.

    python -m app.cli.process_outreach                 # every listing
    python -m app.cli.process_outreach --listing ID    # one listing

It only sends invitations an owner already approved; it can't create or approve any. Rerunning is safe:
sent, failed, suppressed, and in-flight (`sending`) invitations are never sent again.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import sys

from app.core.config import get_settings
from app.db.session import get_session_factory
from app.services.outreach import describe_channel, get_outreach_sender
from app.workers.outreach import process_outreach_queue


def main(argv: list[str] | None = None) -> int:
    """Run one queue pass with the configured channel and print the channel and summary as JSON."""

    args = _parse_args(argv)
    sender = get_outreach_sender(get_settings())
    session = get_session_factory()()
    try:
        summary = process_outreach_queue(session, sender, datetime.now(timezone.utc), listing_id=args.listing)
    finally:
        session.close()
    print(
        json.dumps(
            {"channel": describe_channel(sender).model_dump(), "listing": args.listing, **summary.model_dump()},
            indent=2,
        )
    )
    return 0


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send approved, due invitations once.")
    parser.add_argument("--listing", default=None, help="Only process invitations for this listing id.")
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(main())
