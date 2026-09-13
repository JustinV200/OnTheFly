"""Loads deterministic transaction fixtures from a local JSON file.
This source is the safe default when no real provider credentials are configured.
"""

import json
from datetime import date
from pathlib import Path

from app.core.provenance import FinancialProvenance
from app.services.transactions.source import NormalizedTransaction, TransactionSource

# A provider account selects its checked-in ledger at this file boundary. This keeps the
# synthetic GovCon data in the normal import pipeline without relabelling it as Stripe data.
DATASET_BY_PROVIDER_ACCOUNT = {
    "fixture_govcon_main": "govcon.json",
}


class FixtureSource(TransactionSource):
    """Returns normalized transactions from the checked-in fixture file."""

    def list_transactions(
        self,
        provider_account_id: str,
        since: date,
        until: date,
    ) -> list[NormalizedTransaction]:
        """Return fixture transactions for one account within the date window."""

        dataset_name = DATASET_BY_PROVIDER_ACCOUNT.get(provider_account_id, "data.json")
        dataset_path = Path(__file__).with_name(dataset_name)
        records = json.loads(dataset_path.read_text(encoding="utf-8"))
        transactions: list[NormalizedTransaction] = []
        for record in records:
            if record["provider_account_id"] != provider_account_id:
                continue
            transaction = NormalizedTransaction(**record)
            if not (since <= transaction.posted_at.date() <= until):
                continue
            transaction.source_type = FinancialProvenance.fixture.value
            transactions.append(transaction)
        return transactions
