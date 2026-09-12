"""Checks expense regrouping: orphaned rows after a rename, and how correction rules match."""

from sqlalchemy import select

from app.models.listing import ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.expenses.sync import sync_service_expenses
from app.services.expenses.vendor_normalize import VendorCorrectionStore
from app.services.transactions.import_run import run_import

PROVIDER_ACCOUNT_ID = "fixture_apex_main"


def _vendors(db_session) -> set[str]:
    return set(
        db_session.scalars(
            select(ServiceExpense.normalized_vendor).where(ServiceExpense.owner_account_id == "acc_owner_1")
        ).all()
    )


def test_renamed_vendor_does_not_leave_a_stale_duplicate(db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    VendorCorrectionStore().upsert("acc_owner_1", "ORKIN PEST CONTROL", "Orkin", None, db_session)
    db_session.commit()

    sync_service_expenses("acc_owner_1", db_session)

    vendors = _vendors(db_session)
    assert "Orkin" in vendors
    assert "Orkin Pest Control" not in vendors


def test_regrouped_expense_with_listing_history_is_kept(db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    orkin = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Orkin Pest Control"))
    db_session.add(ScopeVersion(expense_id=orkin.id, version_number=1))
    VendorCorrectionStore().upsert("acc_owner_1", "ORKIN PEST CONTROL", "Orkin", None, db_session)
    db_session.commit()

    sync_service_expenses("acc_owner_1", db_session)

    # Scope versions must keep resolving to the expense they were written against.
    assert db_session.get(ServiceExpense, orkin.id) is not None


def test_correction_rules_match_whole_words_and_prefer_the_most_specific(db_session) -> None:
    store = VendorCorrectionStore()
    store.upsert("acc_owner_1", "orkin", "Orkin (broad rule)", None, db_session)
    store.upsert("acc_owner_1", "ORKIN PEST CONTROL", "Orkin Pest Control", None, db_session)
    db_session.commit()
    resolver = VendorCorrectionStore()

    specific = resolver.resolve("acc_owner_1", "ORKIN PEST CONTROL", "fallback", None, db_session)
    broad = resolver.resolve("acc_owner_1", "SQ *ORKIN 1234", "fallback", None, db_session)
    unrelated = resolver.resolve("acc_owner_1", "PORKINGTON BBQ", "Porkington Bbq", None, db_session)

    assert specific[0] == "Orkin Pest Control"
    assert broad[0] == "Orkin (broad rule)"
    assert unrelated[0] == "Porkington Bbq"


def test_long_descriptor_rules_fit_the_correction_key(db_session) -> None:
    descriptor = "ACH DEBIT " + "SPARKLE CLEANING SERVICES LLC " * 7
    store = VendorCorrectionStore()

    rule = store.upsert("acc_owner_1", descriptor.strip(), "Sparkle Clean", None, db_session)
    again = store.upsert("acc_owner_1", descriptor.strip().lower(), "Sparkle Clean", "cleaning", db_session)
    db_session.commit()

    assert len(rule.id) <= 120
    assert again.id == rule.id
