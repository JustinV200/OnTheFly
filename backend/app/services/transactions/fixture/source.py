"""Loads deterministic transaction fixtures from a local JSON file.
This source is the safe default when no real provider credentials are configured.
"""

from datetime import date
from pathlib import Path
import json

from app.core.provenance import FinancialProvenance
from app.services.transactions.source import NormalizedTransaction, TransactionSource


class FixtureSource(TransactionSource):
    """Returns normalized transactions from the checked-in fixture file."""

    def list_transactions(
        self,
        provider_account_id: str,
        since: date,
        until: date,
    ) -> list[NormalizedTransaction]:
        """Return fixture transactions for one account within the date window."""

        dataset_path = Path(__file__).with_name("data.json")
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
