"""Stage the GovCon → Prime A → Sub B task-chain demo from the command line (plan2, "Demo").

    python -m app.cli.seed_task_chain                    # start: GovCon ledger, fixture rates, one new task
    python -m app.cli.seed_task_chain --stage sub_owns   # the whole chain, money views reconciled

Local SQLite only. It resets the task chain's data (never other businesses') and refuses when a non-demo offer is on it.
"""

import argparse
import json
import sys

from app.db.seed import run_seed
from app.db.session import get_engine, get_session_factory
from app.services.demo.task_chain import STAGE_ORDER, GenuineOfferPresentError, stage_task_chain


def main(argv: list[str] | None = None) -> int:
    """Stage the chain and print the task ids it produced."""

    parser = argparse.ArgumentParser(description="Stage the GovCon task-chain demo.")
    parser.add_argument("--stage", choices=list(STAGE_ORDER), default="start")
    args = parser.parse_args(argv)
    if get_engine().dialect.name != "sqlite":
        print("Refusing: the task-chain demo seed is scoped to local SQLite.", file=sys.stderr)
        return 2
    with get_session_factory()() as db:
        run_seed(db)
        try:
            result = stage_task_chain(args.stage, db)
        except GenuineOfferPresentError as error:
            print(f"Refusing: {error}", file=sys.stderr)
            return 1
    print(json.dumps(result.model_dump(), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
