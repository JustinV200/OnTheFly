"""Exercises the owner-only trace from potential savings down to individual transactions."""

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select

from app.models.listing import PublicListingRecord
from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.services.challenges.submit import submit_challenge
from app.services.listings.create import build_scope_version, create_listing_draft
from app.services.listings.projection import build_payload_hash, build_public_listing
from app.services.listings.types import PublishChoices
from app.services.listings.visibility import publish_listing
from app.services.trace.baseline_membership import find_baseline_membership
from app.services.trace.compound_eye_attribution import compound_eye_attribution
from app.services.transactions.import_run import run_import
from app.services.transactions.source import NormalizedTransaction
from tests.test_challenges import _create_public_listing

FULL_SCOPE = ["vacuum", "trash", "restrooms", "3x weekly", "equipment"]
STRIPE_ACCOUNT_ID = "stripe_trace_account"
FIRST_CHARGE_AT = datetime(2026, 1, 5, tzinfo=timezone.utc)


class _FixedStripeRows:
    """A Stripe-shaped source returning fixed rows; the import window is ignored because the dates are fixed."""

    def __init__(self, rows: list[NormalizedTransaction]) -> None:
        self.rows = rows

    def list_transactions(self, provider_account_id: str, since: date, until: date) -> list[NormalizedTransaction]:
        """Return the rows given at construction."""

        return self.rows


def _stripe_row(
    transaction_id: str,
    days_after_first_charge: int,
    amount_minor: int = 240000,
    direction: str = "debit",
    status: str = "posted",
) -> NormalizedTransaction:
    # Stripe amounts arrive unsigned with the sign kept in direction, so a refund's amount can equal a charge's.
    return NormalizedTransaction(
        provider="stripe",
        provider_account_id=STRIPE_ACCOUNT_ID,
        provider_transaction_id=transaction_id,
        source_type="sandbox",
        raw_description="SPARKLE CLEAN",
        amount_minor=amount_minor,
        currency="USD",
        direction=direction,
        posted_at=FIRST_CHARGE_AT + timedelta(days=days_after_first_charge),
        status=status,
        raw_payload="{}",
    )


def _publish_stripe_listing(db_session, rows: list[NormalizedTransaction]) -> PublicListingRecord:
    run_import("acc_owner_1", STRIPE_ACCOUNT_ID, db_session, source=_FixedStripeRows(rows))
    expense = db_session.scalar(
        select(ServiceExpense).where(
            ServiceExpense.owner_account_id == "acc_owner_1",
            ServiceExpense.normalized_vendor == "Sparkle Clean [USD]",
        )
    )
    assert expense is not None
    scope = build_scope_version(
        expense.id,
        {"visit_frequency": "3x weekly", "current_price_minor": 240000, "billing_cadence": "monthly"},
        db_session,
    )
    choices = PublishChoices(bidding_mode="sealed")
    listing = create_listing_draft(expense, scope, choices, db_session)
    db_session.commit()
    db_session.refresh(listing)
    publish_listing(
        expense_id=expense.id,
        scope_version_id=scope.id,
        choices=choices,
        previewed_payload_hash=build_payload_hash(build_public_listing(listing, expense, scope, choices)),
        acting_account_id="acc_owner_1",
        db=db_session,
    )
    db_session.refresh(listing)
    return listing


def test_trace_links_savings_to_offer_scope_listing_expense_and_transactions(client, db_session) -> None:
    listing = _create_public_listing(db_session)
    challenge = submit_challenge(
        listing.id,
        "acc_challenger_1",
        {"price_minor": 187500, "billing_frequency": "monthly", "scope_included": FULL_SCOPE},
        db_session,
    )

    trace = client.get(f"/api/challenges/{challenge.id}/trace", headers={"X-Account-ID": "acc_owner_1"}).json()
    inbox = client.get(f"/api/listings/{listing.id}/inbox", headers={"X-Account-ID": "acc_owner_1"}).json()

    assert trace["savings"]["baseline_monthly_minor"] == 240000
    assert trace["savings"]["offer_monthly_minor"] == 187500
    assert trace["savings"]["annual_recurring_savings_minor"] == (240000 - 187500) * 12
    # The trace must agree with the inbox figure it explains, to the minor unit.
    assert trace["savings"]["first_year_net_savings_minor"] == inbox["challenges"][0]["savings"]["first_year_net_savings_minor"]
    assert trace["offer"]["provenance"] == "demo_data"
    assert trace["scope_version"]["id"] == challenge.scope_version_id
    assert trace["scope_version"]["is_listing_current_version"] is True
    assert trace["listing"]["id"] == listing.id
    assert trace["baseline"]["source"] == "owner_confirmed_scope"
    assert trace["expense"]["vendor"] == "Sparkle Clean"
    assert len(trace["transactions"]) == trace["expense"]["period_count"]
    assert {transaction["source_type"] for transaction in trace["transactions"]} == {"fixture"}


def test_trace_is_hidden_from_everyone_but_the_owner(client, db_session) -> None:
    listing = _create_public_listing(db_session)
    challenge = submit_challenge(listing.id, "acc_challenger_1", {"price_minor": 187500, "billing_frequency": "monthly"}, db_session)

    as_challenger = client.get(f"/api/challenges/{challenge.id}/trace", headers={"X-Account-ID": "acc_challenger_1"})
    missing = client.get("/api/challenges/does-not-exist/trace", headers={"X-Account-ID": "acc_owner_1"})

    assert as_challenger.status_code == 404
    assert missing.status_code == 404
    assert "240000" not in as_challenger.text


# The trace comes back as parsed JSON, so rows are read by key like the page reads them.
def _trace_as_owner(client, db_session, listing: PublicListingRecord) -> dict[str, Any]:
    challenge = submit_challenge(
        listing.id,
        "acc_challenger_1",
        {"price_minor": 187500, "billing_frequency": "monthly", "scope_included": FULL_SCOPE},
        db_session,
    )
    return client.get(f"/api/challenges/{challenge.id}/trace", headers={"X-Account-ID": "acc_owner_1"}).json()


def _compound_eye_role(trace: dict[str, Any]) -> str:
    # The Compound Eye is the only circuit behind the counted marks, and it is listed even when it didn't run.
    assert [entry["component"] for entry in trace["fly_brain"]] == ["compound_eye"]
    return trace["fly_brain"][0]["role"]


def test_trace_marks_refunds_and_voided_charges_as_outside_the_baseline(client, db_session) -> None:
    debits = [_stripe_row(f"txn_debit_{index}", 30 * index) for index in range(6)]
    refund = _stripe_row("txn_refund", 160, direction="credit")
    voided = _stripe_row("txn_void", 175, status="void")
    listing = _publish_stripe_listing(db_session, [*debits, refund, voided])

    trace = _trace_as_owner(client, db_session, listing)
    rows = {(row["direction"], row["status"]): row for row in trace["transactions"]}
    counted = [row for row in trace["transactions"] if row["counts_toward_baseline"]]

    # The refund carries the same unsigned amount as a charge, so direction is the only thing telling them apart.
    assert len(trace["transactions"]) == 8
    assert rows[("credit", "posted")]["amount_minor"] == 240000
    assert rows[("credit", "posted")]["counts_toward_baseline"] is False
    assert rows[("debit", "void")]["counts_toward_baseline"] is False
    assert rows[("debit", "void")]["is_excluded"] is True
    # The six posted debits are the charges sync computed the stored baseline from, and only they count.
    assert trace["expense"]["period_count"] == 6
    assert trace["expense"]["amount_minor_per_period"] == 240000
    assert len(counted) == 6
    assert {(row["direction"], row["status"]) for row in counted} == {("debit", "posted")}
    # A steady price is a level the Compound Eye found, so the counted marks are labelled as its choice.
    assert _compound_eye_role(trace) == (
        "Separated real price changes from one-off charges and chose the charges the baseline counts."
    )


def test_trace_counts_only_the_current_price_level_after_an_increase(client, db_session) -> None:
    amounts = [240000, 240000, 240000, 265000, 265000, 265000]
    listing = _publish_stripe_listing(
        db_session,
        [_stripe_row(f"txn_debit_{index}", 30 * index, amount_minor=amount) for index, amount in enumerate(amounts)],
    )

    trace = _trace_as_owner(client, db_session, listing)
    counted_amounts = [row["amount_minor"] for row in trace["transactions"] if row["counts_toward_baseline"]]

    # Every row is a posted debit, but the stored baseline is the current price; the earlier charges don't set it.
    assert trace["expense"]["amount_minor_per_period"] == 265000
    assert counted_amounts == [265000, 265000, 265000]
    assert "chose the charges the baseline counts" in _compound_eye_role(trace)


def test_fixture_trace_rows_carry_direction_and_status(client, db_session) -> None:
    listing = _create_public_listing(db_session)

    trace = _trace_as_owner(client, db_session, listing)

    # The fixture's Sparkle Clean charges are one steady price, so every row sets the baseline.
    assert {(row["direction"], row["status"]) for row in trace["transactions"]} == {("debit", "posted")}
    assert all(row["counts_toward_baseline"] for row in trace["transactions"])


def test_trace_lists_the_compound_eye_as_not_run_for_two_charges(client, db_session) -> None:
    listing = _publish_stripe_listing(db_session, [_stripe_row(f"txn_debit_{index}", 30 * index) for index in range(2)])

    trace = _trace_as_owner(client, db_session, listing)

    # Two charges don't establish a recurring schedule, so there is no price level to find: both count toward a
    # plain average, and the attribution gives the circuit's own reason instead of implying it chose them.
    assert all(row["counts_toward_baseline"] for row in trace["transactions"])
    assert _compound_eye_role(trace) == (
        "Not run: this spend doesn't recur on a regular schedule;"
        " the baseline is the plain average of the charges marked counted."
    )


def test_compound_eye_is_listed_as_not_run_when_no_charge_counts() -> None:
    pending_only = [Transaction(id="txn_pending", provider="stripe", status="pending", direction="debit")]

    membership = find_baseline_membership(pending_only)

    # Sync zeroes a group with no posted debits; the circuit never ran, and the attribution must still say so.
    assert membership.transaction_ids == set()
    assert membership.basis is None
    assert compound_eye_attribution(membership).role.startswith("Not run: this vendor has no posted charges")
