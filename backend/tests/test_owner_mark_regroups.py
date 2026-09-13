"""Checks that an owner's not-publishable mark survives every regroup a dashboard re-sync performs.
Covers a rename to a new name, a rename onto an existing expense, alias merges, and a group with no posted charges.
"""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.models.transaction import Transaction
from app.services.expenses.sync import sync_service_expenses

# acc_owner_2 has no fixture import in these tests, so every group comes from the rows added here.
OWNER_ID = "acc_owner_2"
OWNER_HEADERS = {"X-Account-ID": OWNER_ID}


def _add_charges(db_session, descriptor: str, count: int, provider: str = "stripe", first_month: int = 1) -> None:
    """Add `count` posted monthly debits for one descriptor. Neither source sends a category here."""

    for month in range(first_month, first_month + count):
        db_session.add(Transaction(
            owner_account_id=OWNER_ID,
            provider=provider,
            provider_account_id="fca_owner_mark" if provider == "stripe" else "fixture_owner_mark",
            provider_transaction_id=str(uuid.uuid4()),
            source_type="sandbox" if provider == "stripe" else "fixture",
            raw_description=descriptor,
            normalized_vendor=None,
            amount_minor=45000,
            currency="USD",
            direction="debit",
            posted_at=datetime(2026, month, 3, tzinfo=UTC),
            status="posted",
            raw_payload="{}",
        ))
    db_session.commit()


def _set_status(db_session, status: str) -> None:
    for charge in db_session.scalars(select(Transaction).where(Transaction.owner_account_id == OWNER_ID)).all():
        charge.status = status
    db_session.commit()


def _dashboard(client) -> dict[str, dict]:
    response = client.get("/api/expenses", headers=OWNER_HEADERS)
    assert response.status_code == 200
    return {expense["vendor"]: expense for expense in response.json()["expenses"]}


def _patch(client, expense_id: str, body: dict):
    return client.patch(f"/api/expenses/{expense_id}", json=body, headers=OWNER_HEADERS)


def _merge(client, alias_id: str, canonical_id: str):
    return client.post(
        "/api/vendor-aliases/merge",
        headers=OWNER_HEADERS,
        json={"alias_expense_id": alias_id, "canonical_expense_id": canonical_id},
    )


def _create_listing(client, expense_id: str):
    return client.post(
        "/api/listings", json={"expense_id": expense_id, "scope": {}, "choices": {}}, headers=OWNER_HEADERS
    )


def _assert_marked(client, expense: dict, period_count: int) -> None:
    assert (expense["is_publishable"], expense["is_eligible"]) == (False, False)
    assert (expense["eligibility_reason"], expense["period_count"]) == ("owner_marked_ineligible", period_count)
    assert _create_listing(client, expense["id"]).status_code == 400


def test_mark_follows_the_expense_through_a_rename_to_a_new_name(client, db_session) -> None:
    _add_charges(db_session, "SHINE OFFICE SVCS", 4)
    sync_service_expenses(OWNER_ID, db_session)
    expense_id = _dashboard(client)["Shine Office Svcs [USD]"]["id"]
    _patch(client, expense_id, {"is_publishable": False})

    renamed = _patch(client, expense_id, {"owner_corrected_vendor": "Shine Office Services"})
    reloaded = _dashboard(client)

    assert renamed.status_code == 200
    assert list(reloaded) == ["Shine Office Services [USD]"]
    _assert_marked(client, reloaded["Shine Office Services [USD]"], period_count=4)


@pytest.mark.parametrize("is_marked_with_the_rename", [True, False])
def test_mark_survives_a_rename_onto_an_existing_expense(client, db_session, is_marked_with_the_rename: bool) -> None:
    # The rename folds the marked charges into a row that already exists, and the marked row is
    # deleted as an orphan. The mark used to be read only when the regroup created a new row.
    _add_charges(db_session, "SHINE OFFICE SVCS", 4)
    _add_charges(db_session, "SHINE OFFICE SERVICES", 3, first_month=5)
    sync_service_expenses(OWNER_ID, db_session)
    groups = _dashboard(client)
    expense_id = groups["Shine Office Svcs [USD]"]["id"]
    assert groups["Shine Office Services [USD]"]["is_publishable"] is True
    rename = {"owner_corrected_vendor": "Shine Office Services"}
    if is_marked_with_the_rename:
        patched = _patch(client, expense_id, {**rename, "is_publishable": False})
    else:
        _patch(client, expense_id, {"is_publishable": False})
        patched = _patch(client, expense_id, rename)
    assert (patched.status_code, patched.json()["eligibility_reason"]) == (200, "owner_marked_ineligible")

    first_reload = _dashboard(client)
    second_reload = _dashboard(client)

    for reloaded in (first_reload, second_reload):
        assert list(reloaded) == ["Shine Office Services [USD]"]
        _assert_marked(client, reloaded["Shine Office Services [USD]"], period_count=7)


def test_owner_can_clear_a_mark_the_combined_expense_inherited(client, db_session) -> None:
    _add_charges(db_session, "SHINE OFFICE SVCS", 4)
    _add_charges(db_session, "SHINE OFFICE SERVICES", 3, first_month=5)
    sync_service_expenses(OWNER_ID, db_session)
    expense_id = _dashboard(client)["Shine Office Svcs [USD]"]["id"]
    _patch(client, expense_id, {"owner_corrected_vendor": "Shine Office Services", "is_publishable": False})
    combined_id = _dashboard(client)["Shine Office Services [USD]"]["id"]

    cleared = _patch(client, combined_id, {"is_publishable": True})
    reloaded = _dashboard(client)["Shine Office Services [USD]"]

    # Every charge now sits under the combined row's own key, so the next sync finds no marked row to carry from.
    assert cleared.status_code == 200
    assert (reloaded["is_publishable"], reloaded["eligibility_reason"]) == (True, "eligible")


def test_mark_on_a_merged_alias_carries_to_the_canonical_expense(client, db_session) -> None:
    _add_charges(db_session, "SPARKLE CLEAN", 6)
    _add_charges(db_session, "SPARKLE", 1, first_month=7)
    sync_service_expenses(OWNER_ID, db_session)
    groups = _dashboard(client)
    _patch(client, groups["Sparkle [USD]"]["id"], {"is_publishable": False})

    merged = _merge(client, groups["Sparkle [USD]"]["id"], groups["Sparkle Clean [USD]"]["id"])
    reloaded = _dashboard(client)

    assert merged.status_code == 200
    assert list(reloaded) == ["Sparkle Clean [USD]"]
    _assert_marked(client, reloaded["Sparkle Clean [USD]"], period_count=7)


def test_refused_merge_leaves_the_canonical_expense_unmarked(client, db_session) -> None:
    # One descriptor under two providers forms two groups, so the exact merge rule would also move the
    # fixture group's charges. The merge is refused, and its rollback must take the carried mark with it.
    _add_charges(db_session, "SPARKLE CLEAN", 6)
    _add_charges(db_session, "SPARKLE", 1, first_month=7)
    _add_charges(db_session, "SPARKLE", 6, provider="fixture")
    sync_service_expenses(OWNER_ID, db_session)
    groups = _dashboard(client)
    _patch(client, groups["Sparkle [USD]"]["id"], {"is_publishable": False})

    refused = _merge(client, groups["Sparkle [USD]"]["id"], groups["Sparkle Clean [USD]"]["id"])
    reloaded = _dashboard(client)

    assert refused.status_code == 400
    assert (reloaded["Sparkle Clean [USD]"]["is_publishable"], reloaded["Sparkle [USD]"]["is_publishable"]) == (
        True,
        False,
    )


def test_mark_survives_renaming_an_expense_whose_charges_have_not_posted(client, db_session) -> None:
    # With no posted charge the renamed group gets no baseline, and the marked row it left is an orphan.
    # Sync keeps a no-posted-debits row under the new name so the mark is still there once charges post.
    _add_charges(db_session, "SHINE OFFICE SVCS", 4)
    sync_service_expenses(OWNER_ID, db_session)
    expense_id = _dashboard(client)["Shine Office Svcs [USD]"]["id"]
    _patch(client, expense_id, {"is_publishable": False})
    _set_status(db_session, "pending")
    assert _dashboard(client)["Shine Office Svcs [USD]"]["eligibility_reason"] == "no_posted_debits"

    renamed = _patch(client, expense_id, {"owner_corrected_vendor": "Shine Office Services"})
    pending = _dashboard(client)
    _set_status(db_session, "posted")
    posted = _dashboard(client)

    assert renamed.status_code == 200
    assert list(pending) == ["Shine Office Services [USD]"]
    unposted = pending["Shine Office Services [USD]"]
    assert (unposted["is_publishable"], unposted["eligibility_reason"], unposted["period_count"]) == (
        False,
        "no_posted_debits",
        0,
    )
    assert list(posted) == ["Shine Office Services [USD]"]
    _assert_marked(client, posted["Shine Office Services [USD]"], period_count=4)
