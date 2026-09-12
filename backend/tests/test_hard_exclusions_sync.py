"""Checks that transfer and tax spend imports excluded and stays unpublishable through sync and the API.
Stripe marks every outbound movement a debit and sends no category, so the descriptor text is the only signal.
"""

from datetime import UTC, date, datetime

from sqlalchemy import select

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.expenses.sync import sync_service_expenses
from app.services.transactions.import_run import run_import
from app.services.transactions.source import NormalizedTransaction

OWNER_ID = "acc_owner_2"
OWNER_HEADERS = {"X-Account-ID": OWNER_ID}
PROVIDER_ACCOUNT_ID = "acct_hard_exclusions"

# Descriptor -> the exclusion reason it must import with.
EXCLUDED_DESCRIPTORS: dict[str, str] = {
    "ONLINE TRANSFER TO SAVINGS XXXX1234": "transfer",
    "WIRE TRANSFER OUT": "transfer",
    "IRS USATAXPYMT": "tax",
    "STATE SALES TAXES": "tax",
}
# A cleaning company whose name merely contains "transfer" is ordinary spend.
ELIGIBLE_DESCRIPTOR = "TRANSFER PRO CLEANING"


class _FakeStripeSource:
    """Returns six posted monthly debits per descriptor, shaped like the Stripe source's output."""

    def list_transactions(self, provider_account_id: str, since: date, until: date) -> list[NormalizedTransaction]:
        descriptors = [*EXCLUDED_DESCRIPTORS, ELIGIBLE_DESCRIPTOR]
        return [
            NormalizedTransaction(
                provider="stripe",
                provider_account_id=provider_account_id,
                provider_transaction_id=f"fctxn_{index}_{month}",
                source_type="sandbox",
                raw_description=descriptor,
                amount_minor=100000 * (index + 1),
                currency="USD",
                direction="debit",
                posted_at=datetime(2026, month, 5, tzinfo=UTC),
                status="posted",
                raw_payload="{}",
            )
            for index, descriptor in enumerate(descriptors)
            for month in range(1, 7)
        ]


def _expense_for(descriptor: str, db_session) -> ServiceExpense:
    transaction = db_session.scalar(select(Transaction).where(Transaction.raw_description == descriptor).limit(1))
    assert transaction is not None
    expense = db_session.scalar(
        select(ServiceExpense).where(
            ServiceExpense.owner_account_id == OWNER_ID,
            ServiceExpense.normalized_vendor == transaction.normalized_vendor,
        )
    )
    assert expense is not None
    return expense


def test_stripe_transfer_and_tax_debits_import_excluded(db_session) -> None:
    result = run_import(OWNER_ID, PROVIDER_ACCOUNT_ID, db_session, source=_FakeStripeSource())

    assert result.new == 30
    assert result.excluded == 24
    for descriptor, reason in EXCLUDED_DESCRIPTORS.items():
        rows = db_session.scalars(select(Transaction).where(Transaction.raw_description == descriptor)).all()
        assert {(row.is_excluded, row.excluded_reason) for row in rows} == {(True, reason)}, descriptor
        expense = _expense_for(descriptor, db_session)
        assert (expense.is_eligible, expense.is_publishable, expense.eligibility_reason) == (False, False, reason)

    cleaning = _expense_for(ELIGIBLE_DESCRIPTOR, db_session)
    assert (cleaning.is_eligible, cleaning.is_publishable) == (True, True)


def test_transfer_expense_cannot_be_listed_or_forced_publishable(client, db_session) -> None:
    run_import(OWNER_ID, PROVIDER_ACCOUNT_ID, db_session, source=_FakeStripeSource())
    transfer = _expense_for("ONLINE TRANSFER TO SAVINGS XXXX1234", db_session)

    forced = client.patch(f"/api/expenses/{transfer.id}", json={"is_publishable": True}, headers=OWNER_HEADERS)
    listing = client.post(
        "/api/listings",
        json={"expense_id": transfer.id, "scope": {}, "choices": {}},
        headers=OWNER_HEADERS,
    )

    assert forced.status_code == 400
    assert listing.status_code == 400


def _stored_cleaning_row(transaction_id: str, direction: str, month: int) -> Transaction:
    return Transaction(
        id=transaction_id,
        owner_account_id=OWNER_ID,
        provider="fixture",
        provider_account_id=PROVIDER_ACCOUNT_ID,
        provider_transaction_id=transaction_id,
        source_type="fixture",
        raw_description=ELIGIBLE_DESCRIPTOR,
        normalized_vendor="Transfer Pro Cleaning",
        amount_minor=187500 if direction == "debit" else 20000,
        currency="USD",
        direction=direction,
        posted_at=datetime(2026, month, 5, tzinfo=UTC),
        status="posted",
        category="cleaning",
        memo=None,
        counterparty=None,
        raw_payload="{}",
        is_excluded=False,
        excluded_reason=None,
    )


def test_a_refund_stored_first_does_not_make_a_cleaning_group_ineligible(db_session) -> None:
    # Sync used to classify with the first row's direction, so a leading credit flipped the whole group.
    refund = _stored_cleaning_row("a-refund", "credit", 2)
    charges = [_stored_cleaning_row(f"b-charge-{month}", "debit", month) for month in range(1, 5)]
    db_session.add_all([refund, *charges])
    db_session.commit()

    sync_service_expenses(OWNER_ID, db_session)

    expense = _expense_for(ELIGIBLE_DESCRIPTOR, db_session)
    assert (expense.is_eligible, expense.is_publishable) == (True, True)
