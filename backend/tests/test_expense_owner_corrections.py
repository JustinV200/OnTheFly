"""Checks that owner corrections made through PATCH /api/expenses/{id} survive the dashboard's re-sync.
Covers the not-publishable mark, category and vendor corrections on Stripe rows, and partial updates.
How the mark survives a rename or alias merge is covered in test_owner_mark_regroups.py.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction
from app.models.vendor_correction import VendorCorrection
from app.services.expenses.sync import sync_service_expenses
from app.services.transactions.import_run import run_import

# acc_owner_2 has no fixture import in the Stripe tests, so every group comes from the rows added here.
STRIPE_OWNER_ID = "acc_owner_2"
STRIPE_HEADERS = {"X-Account-ID": STRIPE_OWNER_ID}
FIXTURE_OWNER_ID = "acc_owner_1"
FIXTURE_HEADERS = {"X-Account-ID": FIXTURE_OWNER_ID}


def _add_stripe_charges(db_session, descriptor: str, count: int, first_month: int = 1) -> None:
    """Add `count` posted monthly Stripe debits for one descriptor. Stripe sends no category."""

    for month in range(first_month, first_month + count):
        db_session.add(Transaction(
            owner_account_id=STRIPE_OWNER_ID,
            provider="stripe",
            provider_account_id="fca_owner_corrections",
            provider_transaction_id=str(uuid.uuid4()),
            source_type="sandbox",
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


def _dashboard(client, headers: dict[str, str]) -> dict[str, dict]:
    response = client.get("/api/expenses", headers=headers)
    assert response.status_code == 200
    return {expense["vendor"]: expense for expense in response.json()["expenses"]}


def _patch(client, expense_id: str, body: dict, headers: dict[str, str]):
    return client.patch(f"/api/expenses/{expense_id}", json=body, headers=headers)


def _create_listing(client, expense_id: str, headers: dict[str, str]):
    return client.post("/api/listings", json={"expense_id": expense_id, "scope": {}, "choices": {}}, headers=headers)


def test_owner_not_publishable_mark_survives_a_dashboard_reload(client, db_session) -> None:
    run_import(FIXTURE_OWNER_ID, "fixture_apex_main", db_session)
    sparkle = _dashboard(client, FIXTURE_HEADERS)["Sparkle Clean"]
    assert sparkle["is_publishable"] is True

    patched = _patch(client, sparkle["id"], {"is_publishable": False}, FIXTURE_HEADERS)
    reloaded = _dashboard(client, FIXTURE_HEADERS)["Sparkle Clean"]

    assert patched.status_code == 200
    assert (reloaded["is_publishable"], reloaded["is_eligible"]) == (False, False)
    assert reloaded["eligibility_reason"] == "owner_marked_ineligible"
    assert _create_listing(client, reloaded["id"], FIXTURE_HEADERS).status_code == 400


def test_owner_can_clear_their_not_publishable_mark(client, db_session) -> None:
    run_import(FIXTURE_OWNER_ID, "fixture_apex_main", db_session)
    sparkle_id = _dashboard(client, FIXTURE_HEADERS)["Sparkle Clean"]["id"]
    _patch(client, sparkle_id, {"is_publishable": False}, FIXTURE_HEADERS)

    cleared = _patch(client, sparkle_id, {"is_publishable": True}, FIXTURE_HEADERS)
    reloaded = _dashboard(client, FIXTURE_HEADERS)["Sparkle Clean"]

    assert cleared.status_code == 200
    assert (reloaded["is_publishable"], reloaded["eligibility_reason"]) == (True, "eligible")


def test_stripe_category_correction_to_tax_persists_across_reloads(client, db_session) -> None:
    _add_stripe_charges(db_session, "CITY OF SF LICENSE", 4)
    sync_service_expenses(STRIPE_OWNER_ID, db_session)
    license_fee = _dashboard(client, STRIPE_HEADERS)["City Of License [USD]"]
    assert license_fee["is_publishable"] is True

    patched = _patch(client, license_fee["id"], {"owner_corrected_category": "tax"}, STRIPE_HEADERS)
    first_reload = _dashboard(client, STRIPE_HEADERS)["City Of License [USD]"]
    second_reload = _dashboard(client, STRIPE_HEADERS)["City Of License [USD]"]

    assert patched.status_code == 200
    for reloaded in (first_reload, second_reload):
        assert (reloaded["category"], reloaded["is_publishable"], reloaded["eligibility_reason"]) == (
            "tax",
            False,
            "tax",
        )
    assert _create_listing(client, first_reload["id"], STRIPE_HEADERS).status_code == 400
    # The rule is keyed by the bank descriptor itself, never by the currency-suffixed group key.
    db_session.expire_all()
    rules = db_session.scalars(
        select(VendorCorrection).where(VendorCorrection.owner_account_id == STRIPE_OWNER_ID)
    ).all()
    assert [(rule.raw_description_pattern, rule.corrected_category, rule.match_mode) for rule in rules] == [
        ("CITY OF SF LICENSE", "tax", "exact")
    ]


def test_a_later_partial_patch_keeps_earlier_corrections(client, db_session) -> None:
    _add_stripe_charges(db_session, "CITY OF SF LICENSE", 4)
    sync_service_expenses(STRIPE_OWNER_ID, db_session)
    expense_id = _dashboard(client, STRIPE_HEADERS)["City Of License [USD]"]["id"]
    _patch(client, expense_id, {"owner_corrected_category": "tax"}, STRIPE_HEADERS)

    marked = _patch(client, expense_id, {"is_publishable": False}, STRIPE_HEADERS)
    renamed = _patch(client, expense_id, {"owner_corrected_vendor": "City Permits"}, STRIPE_HEADERS)
    reloaded = _dashboard(client, STRIPE_HEADERS)

    assert (marked.status_code, renamed.status_code) == (200, 200)
    assert marked.json()["category"] == "tax"
    assert (renamed.json()["vendor"], renamed.json()["category"]) == ("City Permits", "tax")
    # The rename regroups the charges under the Stripe key for the new name, and the category rule goes with them.
    assert list(reloaded) == ["City Permits [USD]"]
    permits = reloaded["City Permits [USD]"]
    assert (permits["category"], permits["is_publishable"], permits["period_count"]) == ("tax", False, 4)


def test_marking_a_hard_exclusion_not_publishable_keeps_its_exclusion_reason(client, db_session) -> None:
    _add_stripe_charges(db_session, "WIRE TRANSFER OUT", 4)
    sync_service_expenses(STRIPE_OWNER_ID, db_session)
    transfer_id = _dashboard(client, STRIPE_HEADERS)["Wire Transfer Out [USD]"]["id"]

    marked = _patch(client, transfer_id, {"is_publishable": False}, STRIPE_HEADERS)
    forced = _patch(client, transfer_id, {"is_publishable": True}, STRIPE_HEADERS)
    reloaded = _dashboard(client, STRIPE_HEADERS)["Wire Transfer Out [USD]"]

    assert (marked.status_code, forced.status_code) == (200, 400)
    assert (reloaded["is_publishable"], reloaded["eligibility_reason"]) == (False, "transfer")


def test_category_correction_on_a_merged_expense_keeps_the_merge(client, db_session) -> None:
    _add_stripe_charges(db_session, "SPARKLE CLEAN", 6)
    _add_stripe_charges(db_session, "SPARKLE", 1, first_month=7)
    sync_service_expenses(STRIPE_OWNER_ID, db_session)
    groups = _dashboard(client, STRIPE_HEADERS)
    merged = client.post(
        "/api/vendor-aliases/merge",
        headers=STRIPE_HEADERS,
        json={
            "alias_expense_id": groups["Sparkle [USD]"]["id"],
            "canonical_expense_id": groups["Sparkle Clean [USD]"]["id"],
        },
    )
    assert merged.status_code == 200

    patched = _patch(client, merged.json()["expense_id"], {"owner_corrected_category": "cleaning"}, STRIPE_HEADERS)
    reloaded = _dashboard(client, STRIPE_HEADERS)

    assert patched.status_code == 200
    # A category-only correction must not overwrite the merge rule's vendor and split the group again.
    assert list(reloaded) == ["Sparkle Clean [USD]"]
    assert (reloaded["Sparkle Clean [USD]"]["period_count"], reloaded["Sparkle Clean [USD]"]["category"]) == (
        7,
        "cleaning",
    )


def test_owner_mark_is_stored_on_the_expense_row(client, db_session) -> None:
    _add_stripe_charges(db_session, "SHINE OFFICE SVCS", 4)
    sync_service_expenses(STRIPE_OWNER_ID, db_session)
    expense_id = _dashboard(client, STRIPE_HEADERS)["Shine Office Svcs [USD]"]["id"]

    _patch(client, expense_id, {"is_publishable": False}, STRIPE_HEADERS)
    sync_service_expenses(STRIPE_OWNER_ID, db_session)

    db_session.expire_all()
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.id == expense_id))
    assert expense is not None
    assert (expense.owner_marked_ineligible, expense.is_publishable) == (True, False)


def test_owner_mark_survives_a_sync_where_no_charge_has_posted(client, db_session) -> None:
    _add_stripe_charges(db_session, "SHINE OFFICE SVCS", 4)
    sync_service_expenses(STRIPE_OWNER_ID, db_session)
    expense_id = _dashboard(client, STRIPE_HEADERS)["Shine Office Svcs [USD]"]["id"]
    _patch(client, expense_id, {"is_publishable": False}, STRIPE_HEADERS)
    charges = db_session.scalars(select(Transaction).where(Transaction.owner_account_id == STRIPE_OWNER_ID)).all()

    # A Stripe status update can turn every charge back to pending; sync then has no baseline to show.
    for charge in charges:
        charge.status = "pending"
    db_session.commit()
    pending = _dashboard(client, STRIPE_HEADERS)["Shine Office Svcs [USD]"]
    for charge in charges:
        charge.status = "posted"
    db_session.commit()
    posted_again = _dashboard(client, STRIPE_HEADERS)["Shine Office Svcs [USD]"]

    assert (pending["is_publishable"], pending["eligibility_reason"]) == (False, "no_posted_debits")
    assert (posted_again["is_publishable"], posted_again["eligibility_reason"]) == (False, "owner_marked_ineligible")
