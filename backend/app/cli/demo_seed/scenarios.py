"""Seeds one of the two known demo states onto an empty schema.
live:   everything private and nothing published, for performing the script from the dashboard.
staged: the cleaning listing already public with simulated and genuine offers, plus a second business's
        comparable listing for fly-brain similar listings, for rehearsing later steps or recovering.
"""

from typing import Literal

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.cli.demo_seed.demo_marketplace import (
    DEMO_OWNER_ID,
    NEIGHBOR_OWNER_ID,
    publish_demo_cleaning_listing,
    publish_neighbor_cleaning_listing,
    seed_demo_offers,
)
from app.cli.demo_seed.ledger import GenuineOfferLedger
from app.cli.demo_seed.restore import restore_accounts, restore_genuine_offers
from app.core.visibility import ListingVisibility
from app.db.seed import run_seed
from app.models.account import Account
from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.services.evidence.refresh import get_or_refresh_challenger_evidence
from app.services.transactions.connection import get_connection
from app.services.transactions.import_run import run_import

Scenario = Literal["live", "staged"]


class SeedSummary(BaseModel):
    """What the seed produced, printed so the presenter can check it at a glance."""

    scenario: Scenario
    accounts: int
    transactions_imported: int
    expenses: int
    public_expenses: int
    public_listings: int
    demo_offers: int
    genuine_offers_in_ledger: int
    genuine_offers_restored: int
    genuine_offers_skipped: list[str]


def seed_scenario(scenario: Scenario, ledger: GenuineOfferLedger, transaction_source: str, db: Session) -> SeedSummary:
    """Seed accounts and the owner's transactions, then the staged marketplace when asked."""

    run_seed(db)
    restore_accounts(ledger, db)
    # Both publishing businesses import in every scenario; their transactions stay private until staged publishes.
    transactions_imported = sum(
        _import_owner_transactions(owner_id, transaction_source, db) for owner_id in (DEMO_OWNER_ID, NEIGHBOR_OWNER_ID)
    )

    demo_offer_ids: list[str] = []
    restored_ids: list[str] = []
    skipped: list[str] = []
    if scenario == "staged":
        # The neighbour publishes first so the demo owner's listing stays at the top of the newest-first feed.
        publish_neighbor_cleaning_listing(db)
        listing = publish_demo_cleaning_listing(db)
        demo_offer_ids = seed_demo_offers(listing, db)
        for challenge_id in demo_offer_ids:
            challenge = db.get(Challenge, challenge_id)
            if challenge is not None:
                get_or_refresh_challenger_evidence(challenge, db)
        restore = restore_genuine_offers(listing, ledger, db)
        restored_ids, skipped = restore.challenge_ids, restore.skipped
    elif ledger.entries:
        # In live the listing doesn't exist yet, so there is nothing to attach to. The ledger
        # keeps the offers; staged is the scenario that shows them.
        skipped = [f"{entry.key}: held in the ledger; restored by --scenario staged" for entry in ledger.entries]

    return SeedSummary(
        scenario=scenario,
        accounts=_count(db, select(func.count()).select_from(Account)),
        transactions_imported=transactions_imported,
        expenses=_count(db, select(func.count()).select_from(ServiceExpense)),
        public_expenses=_count(
            db,
            select(func.count()).select_from(ServiceExpense).where(
                ServiceExpense.visibility == ListingVisibility.public.value
            ),
        ),
        public_listings=_count(
            db,
            select(func.count()).select_from(PublicListingRecord).where(
                PublicListingRecord.visibility == ListingVisibility.public.value
            ),
        ),
        demo_offers=len(demo_offer_ids),
        genuine_offers_in_ledger=len(ledger.entries),
        genuine_offers_restored=len(restored_ids),
        genuine_offers_skipped=skipped,
    )


def _import_owner_transactions(owner_id: str, transaction_source: str, db: Session) -> int:
    connection = get_connection(owner_id, transaction_source)
    if connection is None:
        raise RuntimeError(
            f"{owner_id} has no connection for transaction source '{transaction_source}'. "
            "Add one in services/transactions/connection/resolve.py or run with TRANSACTION_SOURCE=fixture."
        )
    return run_import(owner_id, connection.provider_account_id, db).new


def _count(db: Session, query) -> int:
    return int(db.scalar(query) or 0)
