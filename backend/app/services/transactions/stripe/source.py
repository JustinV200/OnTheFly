"""Paginate sandbox transactions and normalize Stripe's signed minor-unit amounts."""

from datetime import UTC, date, datetime

from app.services.transactions.source import NormalizedTransaction, TransactionSource

from .client import StripeClient, StripeError
from .schemas import Transactions


class StripeFinancialConnectionsSource(TransactionSource):
    """Retrieve sandbox transactions after the caller validates company ownership."""

    def list_transactions(
        self,
        provider_account_id: str,
        since: date,
        until: date,
    ) -> list[NormalizedTransaction]:
        """Include all statuses so later imports reconcile posted or void payments."""

        params = {"account": provider_account_id, "limit": "100"}
        result: list[NormalizedTransaction] = []
        seen: set[str] = set()
        for _ in range(100):
            page = StripeClient().request(
                "GET", "financial_connections/transactions", Transactions, params
            )
            for item in page.data:
                if item.account != provider_account_id or item.id in seen:
                    raise StripeError(
                        "Stripe returned inconsistent transaction pagination."
                    )
                seen.add(item.id)
                # Fetch older rows as well: a later void must update an existing import.
                result.append(
                    NormalizedTransaction(
                        provider="stripe",
                        provider_account_id=item.account,
                        provider_transaction_id=item.id,
                        source_type="sandbox",
                        raw_description=item.description,
                        amount_minor=abs(item.amount),
                        currency=item.currency.upper(),
                        direction="debit" if item.amount < 0 else "credit",
                        posted_at=datetime.fromtimestamp(item.transacted_at, UTC),
                        status=item.status,
                        raw_payload=item.model_dump_json(),
                    )
                )
            if not page.has_more:
                return result
            if not page.data:
                raise StripeError("Stripe returned an empty pagination page.")
            params["starting_after"] = page.data[-1].id
        raise StripeError("Transaction import exceeded the sandbox page limit.")
