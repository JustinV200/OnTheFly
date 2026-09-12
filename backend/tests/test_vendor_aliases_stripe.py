"""Checks vendor alias suggestions and merges on Stripe rows, whose group keys carry a " [CUR]" suffix.
The suffix must never reach a correction rule or a name comparison, and a merge that can't fold must change nothing.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.models.vendor_correction import VendorCorrection
from app.services.expenses.sync import sync_service_expenses
from app.services.expenses.vendor_group_key import base_vendor_name, vendor_group_key

# acc_owner_2 has no fixture import in these tests, so every group comes from the rows added here.
OWNER_ID = "acc_owner_2"
OWNER_HEADERS = {"X-Account-ID": OWNER_ID}


def _add_charges(db_session, descriptor: str, count: int, provider: str = "stripe", first_month: int = 1) -> None:
    """Add `count` posted monthly debits for one descriptor, shaped like the Stripe source's rows."""

    for month in range(first_month, first_month + count):
        db_session.add(Transaction(
            owner_account_id=OWNER_ID,
            provider=provider,
            provider_account_id="fca_alias_test" if provider == "stripe" else "fixture_alias_test",
            provider_transaction_id=str(uuid.uuid4()),
            source_type="sandbox" if provider == "stripe" else "fixture",
            raw_description=descriptor,
            normalized_vendor=None,
            amount_minor=25000,
            currency="USD",
            direction="debit",
            posted_at=datetime(2026, month, 3, tzinfo=UTC),
            status="posted",
            raw_payload="{}",
        ))
    db_session.commit()


def _groups(client) -> list[tuple[str, int]]:
    response = client.get("/api/expenses", headers=OWNER_HEADERS)
    assert response.status_code == 200
    return sorted((expense["vendor"], expense["period_count"]) for expense in response.json()["expenses"])


def _suggestions(client) -> list[dict]:
    response = client.get("/api/vendor-aliases", headers=OWNER_HEADERS)
    assert response.status_code == 200
    return response.json()["suggestions"]


def _expense_id(db_session, vendor_key: str) -> str:
    expense = db_session.scalar(select(ServiceExpense).where(
        ServiceExpense.owner_account_id == OWNER_ID, ServiceExpense.normalized_vendor == vendor_key))
    assert expense is not None
    return expense.id


def _merge(client, alias_id: str, canonical_id: str):
    return client.post(
        "/api/vendor-aliases/merge",
        headers=OWNER_HEADERS,
        json={"alias_expense_id": alias_id, "canonical_expense_id": canonical_id},
    )


def test_group_key_suffix_is_idempotent_and_strippable() -> None:
    assert vendor_group_key("Sparkle Clean", "stripe", "USD") == "Sparkle Clean [USD]"
    # A name that already carries the suffix (a rule saved before this fix) gets exactly one.
    assert vendor_group_key("Sparkle Clean [USD] [USD]", "stripe", "USD") == "Sparkle Clean [USD]"
    assert vendor_group_key("Sparkle Clean", "fixture", "USD") == "Sparkle Clean"
    assert base_vendor_name("Sparkle Clean [USD] [USD]", "USD") == "Sparkle Clean"
    assert base_vendor_name("Sparkle Clean [USD]", "EUR") == "Sparkle Clean [USD]"


def test_stripe_merge_folds_the_alias_into_one_group_and_stays_merged(client, db_session) -> None:
    _add_charges(db_session, "SPARKLE CLEAN", 6)
    _add_charges(db_session, "SPARKLE CLEANING SERVICES LLC", 1, first_month=7)
    sync_service_expenses(OWNER_ID, db_session)
    suggestion = _suggestions(client)[0]
    assert suggestion["canonical"]["vendor"] == "Sparkle Clean [USD]"
    assert suggestion["shared_words"] == ["sparkle"]

    response = _merge(client, suggestion["alias"]["expense_id"], suggestion["canonical"]["expense_id"])

    assert response.status_code == 200
    assert response.json()["vendor"] == "Sparkle Clean [USD]"
    assert response.json()["period_count"] == 7
    assert _groups(client) == [("Sparkle Clean [USD]", 7)]
    assert _suggestions(client) == []
    db_session.expire_all()
    rules = db_session.scalars(select(VendorCorrection).where(VendorCorrection.owner_account_id == OWNER_ID)).all()
    assert [rule.corrected_vendor for rule in rules] == ["Sparkle Clean"]


def test_merge_whose_rule_also_matches_the_canonical_descriptor_succeeds(client, db_session) -> None:
    # "SPARKLE CLEAN" is a whole-word part of the canonical's own descriptor, which used to
    # regroup the canonical under a double-suffixed key and return 500 after committing.
    _add_charges(db_session, "SPARKLE CLEAN SERVICES LLC", 6)
    _add_charges(db_session, "SPARKLE CLEAN", 1, first_month=7)
    sync_service_expenses(OWNER_ID, db_session)
    suggestion = _suggestions(client)[0]

    response = _merge(client, suggestion["alias"]["expense_id"], suggestion["canonical"]["expense_id"])

    assert response.status_code == 200
    assert response.json()["period_count"] == 7
    assert _groups(client) == [("Sparkle Clean Services Llc [USD]", 7)]


def test_owner_can_merge_against_the_suggested_direction(client, db_session) -> None:
    _add_charges(db_session, "SPARKLE CLEAN", 6)
    _add_charges(db_session, "SPARKLE CLEAN SERVICES LLC", 1, first_month=7)
    sync_service_expenses(OWNER_ID, db_session)

    response = _merge(
        client,
        _expense_id(db_session, "Sparkle Clean [USD]"),
        _expense_id(db_session, "Sparkle Clean Services Llc [USD]"),
    )

    assert response.status_code == 200
    assert response.json()["period_count"] == 7
    assert _groups(client) == [("Sparkle Clean Services Llc [USD]", 7)]


def test_currency_suffix_alone_never_creates_a_suggestion(client, db_session) -> None:
    # As plain names these score 0.56, under the threshold; "usd" as a shared word pushed them to 0.65.
    _add_charges(db_session, "METRO CLEANING", 4)
    _add_charges(db_session, "METRO PARKING", 4)
    sync_service_expenses(OWNER_ID, db_session)

    assert _suggestions(client) == []


def test_merge_that_cannot_fold_the_alias_changes_nothing(client, db_session) -> None:
    # A fixture group's key has no currency suffix, so rules can never move Stripe charges
    # into it. The merge must refuse and roll back rather than report success.
    _add_charges(db_session, "SPARKLE CLEAN", 6, provider="fixture")
    _add_charges(db_session, "SPARKLE CLEAN SERVICES LLC", 1, first_month=7)
    sync_service_expenses(OWNER_ID, db_session)
    assert _suggestions(client) == []

    response = _merge(
        client,
        _expense_id(db_session, "Sparkle Clean Services Llc [USD]"),
        _expense_id(db_session, "Sparkle Clean"),
    )

    assert response.status_code == 400
    db_session.expire_all()
    assert db_session.scalars(select(VendorCorrection).where(VendorCorrection.owner_account_id == OWNER_ID)).all() == []
    assert _groups(client) == [("Sparkle Clean", 6), ("Sparkle Clean Services Llc [USD]", 1)]
