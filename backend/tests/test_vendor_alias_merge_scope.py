"""Checks that an alias merge moves exactly the alias group's charges and nothing else.
Merge rules match their whole descriptor only, and a merge that would still regroup another expense is refused.
"""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.models.listing import ScopeVersion
from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.models.vendor_correction import VendorCorrection
from app.services.expenses.sync import sync_service_expenses
from app.services.expenses.vendor_group_key import vendor_group_key

# acc_owner_2 has no fixture import in these tests, so every group comes from the rows added here.
OWNER_ID = "acc_owner_2"
OWNER_HEADERS = {"X-Account-ID": OWNER_ID}


def _add_charges(
    db_session,
    descriptor: str,
    count: int,
    provider: str,
    first_month: int = 1,
    amount_minor: int = 25000,
) -> None:
    """Add `count` posted monthly debits for one descriptor from the given provider."""

    for month in range(first_month, first_month + count):
        db_session.add(Transaction(
            owner_account_id=OWNER_ID,
            provider=provider,
            provider_account_id="fca_alias_scope" if provider == "stripe" else "fixture_alias_scope",
            provider_transaction_id=str(uuid.uuid4()),
            source_type="sandbox" if provider == "stripe" else "fixture",
            raw_description=descriptor,
            normalized_vendor=None,
            amount_minor=amount_minor,
            currency="USD",
            direction="debit",
            posted_at=datetime(2026, month, 3, tzinfo=UTC),
            status="posted",
            raw_payload="{}",
        ))
    db_session.commit()


def _expense_id(db_session, vendor_key: str) -> str:
    expense = db_session.scalar(select(ServiceExpense).where(
        ServiceExpense.owner_account_id == OWNER_ID, ServiceExpense.normalized_vendor == vendor_key))
    assert expense is not None
    return expense.id


def _groups(client) -> list[tuple[str, int]]:
    response = client.get("/api/expenses", headers=OWNER_HEADERS)
    assert response.status_code == 200
    return sorted((expense["vendor"], expense["period_count"]) for expense in response.json()["expenses"])


def _rules(db_session) -> list[tuple[str, str, str]]:
    db_session.expire_all()
    rules = db_session.scalars(select(VendorCorrection).where(VendorCorrection.owner_account_id == OWNER_ID)).all()
    return sorted((rule.raw_description_pattern, rule.corrected_vendor or "", rule.match_mode) for rule in rules)


def _merge(client, alias_id: str, canonical_id: str):
    return client.post(
        "/api/vendor-aliases/merge",
        headers=OWNER_HEADERS,
        json={"alias_expense_id": alias_id, "canonical_expense_id": canonical_id},
    )


@pytest.mark.parametrize("provider", ["fixture", "stripe"])
def test_merge_leaves_a_listed_vendor_whose_descriptor_contains_the_alias_alone(client, db_session, provider) -> None:
    # "SPARKLE" is a whole word of "SPARKLE WINDOWS". A whole-word merge rule used to sweep the
    # window cleaner's charges into Sparkle Clean and strand its listed expense with none.
    _add_charges(db_session, "SPARKLE CLEAN", 6, provider)
    _add_charges(db_session, "SPARKLE", 1, provider, first_month=7)
    _add_charges(db_session, "SPARKLE WINDOWS", 6, provider, amount_minor=9000)
    sync_service_expenses(OWNER_ID, db_session)
    windows_key = vendor_group_key("Sparkle Windows", provider, "USD")
    windows_id = _expense_id(db_session, windows_key)
    db_session.add(ScopeVersion(expense_id=windows_id, version_number=1))
    db_session.commit()

    response = _merge(
        client,
        _expense_id(db_session, vendor_group_key("Sparkle", provider, "USD")),
        _expense_id(db_session, vendor_group_key("Sparkle Clean", provider, "USD")),
    )

    assert response.status_code == 200
    assert response.json()["period_count"] == 7
    assert response.json()["cadence"] == "monthly"
    assert _groups(client) == [(vendor_group_key("Sparkle Clean", provider, "USD"), 7), (windows_key, 6)]
    detail = client.get(f"/api/expenses/{windows_id}", headers=OWNER_HEADERS)
    assert len(detail.json()["supporting_transactions"]) == 6
    assert client.get(f"/api/spend-signals/{windows_id}", headers=OWNER_HEADERS).status_code == 200
    assert _rules(db_session) == [("SPARKLE", "Sparkle Clean", "exact")]


@pytest.mark.parametrize("is_listed", [False, True])
def test_merge_that_would_regroup_another_expense_is_refused(client, db_session, is_listed: bool) -> None:
    # One descriptor under two providers forms two groups ("Sparkle [USD]" and "Sparkle"). Even an
    # exact rule for the Stripe alias would move the fixture group's charges, which the owner never chose.
    _add_charges(db_session, "SPARKLE CLEAN", 6, "stripe")
    _add_charges(db_session, "SPARKLE", 1, "stripe", first_month=7)
    _add_charges(db_session, "SPARKLE", 6, "fixture", amount_minor=9000)
    sync_service_expenses(OWNER_ID, db_session)
    if is_listed:
        db_session.add(ScopeVersion(expense_id=_expense_id(db_session, "Sparkle"), version_number=1))
        db_session.commit()
    before = _groups(client)

    response = _merge(client, _expense_id(db_session, "Sparkle [USD]"), _expense_id(db_session, "Sparkle Clean [USD]"))

    assert response.status_code == 400
    expected_reason = "listing history" if is_listed else "other expenses"
    assert expected_reason in response.json()["detail"]
    assert _rules(db_session) == []
    assert _groups(client) == before
