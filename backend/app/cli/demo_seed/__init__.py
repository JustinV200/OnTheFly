"""Demo reset package: genuine-offer ledger, schema reset, and the live and staged seed scenarios."""

from app.cli.demo_seed.capture import CaptureResult, capture_genuine_offers, challenges_table_exists
from app.cli.demo_seed.connections import MissingDemoConnectionError, require_demo_connections
from app.cli.demo_seed.ledger import GenuineOfferLedger, LedgerEntry, load_ledger, merge_entries, save_ledger
from app.cli.demo_seed.reset import BACKEND_DIR, reset_schema
from app.cli.demo_seed.scenarios import Scenario, SeedSummary, seed_scenario

__all__ = [
    "BACKEND_DIR",
    "CaptureResult",
    "GenuineOfferLedger",
    "LedgerEntry",
    "MissingDemoConnectionError",
    "Scenario",
    "SeedSummary",
    "capture_genuine_offers",
    "challenges_table_exists",
    "load_ledger",
    "merge_entries",
    "require_demo_connections",
    "reset_schema",
    "save_ledger",
    "seed_scenario",
]
