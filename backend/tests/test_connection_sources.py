"""Checks that GET /api/connection reads the same records as the Stripe panel.
A Stripe link is a FinancialConnection row with a bank account, whatever TRANSACTION_SOURCE says, and every
count is labelled by the provider of the stored rows rather than by the configured source.
"""

from datetime import UTC, datetime

import pytest
from app.core.config import get_settings
from app.models import FinancialConnection, Transaction
from sqlalchemy import func, select
from sqlalchemy.orm import Session

OWNER = {"X-Account-ID": "acc_owner_1"}
CHALLENGER = {"X-Account-ID": "acc_challenger_1"}
GOVCON = {"X-Account-ID": "acc_govcon_1"}


def _link_stripe(db: Session, account_id: str, bank_account_id: str | None = "fca_linked") -> None:
    """Store the row the Stripe consent flow leaves behind, without calling Stripe."""

    db.add(
        FinancialConnection(
            owner_account_id=account_id,
            customer_id=f"cus_{account_id}",
            session_id=f"fcsess_{account_id}",
            bank_account_id=bank_account_id,
        )
    )
    db.commit()


def _store_stripe_rows(db: Session, account_id: str, count: int) -> None:
    """Store sandbox rows shaped like a completed Stripe sync for one account."""

    for index in range(count):
        db.add(
            Transaction(
                owner_account_id=account_id,
                provider="stripe",
                provider_account_id="fca_linked",
                provider_transaction_id=f"fctxn_{account_id}_{index}",
                source_type="sandbox",
                raw_description="ABC Cleaning",
                amount_minor=240000,
                currency="USD",
                direction="debit",
                posted_at=datetime(2026, 8, 1 + index, tzinfo=UTC),
                status="posted",
                raw_payload="{}",
            )
        )
    db.commit()


def _use_source(monkeypatch: pytest.MonkeyPatch, source: str) -> None:
    monkeypatch.setenv("TRANSACTION_SOURCE", source)
    get_settings.cache_clear()


def _count_rows(db: Session, provider: str) -> int:
    return int(db.scalar(select(func.count()).select_from(Transaction).where(Transaction.provider == provider)) or 0)


def test_fixture_only_business_reports_its_fixture_link_and_rows(client) -> None:
    client.post("/api/connection/import", headers=OWNER)

    summary = client.get("/api/connection", headers=OWNER).json()

    assert summary["status"] == "imported"
    assert summary["connections"] == [
        {
            "provider": "fixture",
            "provider_account_id": "fixture_apex_main",
            "provenance": "fixture",
            "imported_through": "connection_import",
        }
    ]
    assert [(source["provider"], source["source_type"], source["is_connected"]) for source in summary["sources"]] == [
        ("fixture", "fixture", True)
    ]
    assert summary["sources"][0]["transaction_count"] == summary["transaction_count"]


def test_govcon_fixture_and_stripe_can_coexist_without_blending_provenance(client, db_session) -> None:
    """The buyer reads its synthetic ledger normally and can add separate sandbox rows."""

    response = client.post("/api/connection/import", headers=GOVCON)
    assert response.status_code == 202
    _link_stripe(db_session, "acc_govcon_1")
    _store_stripe_rows(db_session, "acc_govcon_1", 2)

    summary = client.get("/api/connection", headers=GOVCON).json()

    assert [connection["provider"] for connection in summary["connections"]] == ["fixture", "stripe"]
    assert [
        (source["provider"], source["source_type"], source["transaction_count"])
        for source in summary["sources"]
    ] == [("fixture", "fixture", 30), ("stripe", "sandbox", 2)]


def test_stripe_link_counts_as_connected_before_any_rows_arrive(client, db_session) -> None:
    _link_stripe(db_session, "acc_challenger_1")

    summary = client.get("/api/connection", headers=CHALLENGER).json()

    assert summary["status"] == "connected_not_imported"
    # The bank account id stays server-side (stripe/NOTES.md); the owner sees the link, not the identifier.
    assert summary["connections"] == [
        {"provider": "stripe", "provider_account_id": None, "provenance": "sandbox", "imported_through": "stripe_sync"}
    ]
    assert summary["sources"] == []


def test_unfinished_stripe_consent_is_not_a_connection(client, db_session) -> None:
    _link_stripe(db_session, "acc_challenger_1", bank_account_id=None)

    summary = client.get("/api/connection", headers=CHALLENGER).json()

    assert summary["status"] == "not_connected"
    assert summary["connections"] == []


def test_stripe_rows_are_never_labelled_as_fixture_data(client, db_session) -> None:
    _link_stripe(db_session, "acc_owner_1")
    _store_stripe_rows(db_session, "acc_owner_1", 3)

    summary = client.get("/api/connection", headers=OWNER).json()

    assert summary["status"] == "imported"
    assert [(source["provider"], source["source_type"], source["transaction_count"]) for source in summary["sources"]] == [
        ("stripe", "sandbox", 3)
    ]
    assert [connection["provider"] for connection in summary["connections"]] == ["fixture", "stripe"]


def test_stripe_only_business_cannot_pull_fixture_data_through_the_connection_import(client, db_session) -> None:
    _link_stripe(db_session, "acc_challenger_1")
    _store_stripe_rows(db_session, "acc_challenger_1", 3)

    response = client.post("/api/connection/import", headers=CHALLENGER)

    assert response.status_code == 400
    assert "Stripe" in response.json()["detail"]
    assert _count_rows(db_session, "fixture") == 0
    summary = client.get("/api/connection", headers=CHALLENGER).json()
    assert [(source["provider"], source["is_connected"]) for source in summary["sources"]] == [("stripe", True)]


def test_mixed_fixture_and_stripe_rows_are_counted_per_provider(client, db_session) -> None:
    client.post("/api/connection/import", headers=OWNER)
    fixture_count = _count_rows(db_session, "fixture")
    _link_stripe(db_session, "acc_owner_1")
    _store_stripe_rows(db_session, "acc_owner_1", 3)

    summary = client.get("/api/connection", headers=OWNER).json()

    assert summary["status"] == "imported"
    assert summary["transaction_count"] == fixture_count + 3
    assert [(source["provider"], source["source_type"], source["transaction_count"]) for source in summary["sources"]] == [
        ("fixture", "fixture", fixture_count),
        ("stripe", "sandbox", 3),
    ]
    assert summary["provenance"] == ["fixture", "sandbox"]


def test_stripe_mode_reports_the_stripe_link_and_marks_leftover_fixture_rows_disconnected(
    client, db_session, monkeypatch
) -> None:
    client.post("/api/connection/import", headers=OWNER)
    _use_source(monkeypatch, "stripe")
    _link_stripe(db_session, "acc_owner_1")
    _store_stripe_rows(db_session, "acc_owner_1", 3)

    summary = client.get("/api/connection", headers=OWNER).json()
    response = client.post("/api/connection/import", headers=OWNER)

    assert [connection["provider"] for connection in summary["connections"]] == ["stripe"]
    assert [(source["provider"], source["is_connected"]) for source in summary["sources"]] == [
        ("fixture", False),
        ("stripe", True),
    ]
    assert response.status_code == 400
    assert "Stripe" in response.json()["detail"]


def test_stripe_mode_link_before_import_is_connected_not_imported(client, db_session, monkeypatch) -> None:
    _use_source(monkeypatch, "stripe")
    _link_stripe(db_session, "acc_owner_1")

    summary = client.get("/api/connection", headers=OWNER).json()

    assert summary["status"] == "connected_not_imported"
    assert [connection["provider"] for connection in summary["connections"]] == ["stripe"]


def test_excluded_reasons_come_from_the_stored_rows(client, db_session) -> None:
    _link_stripe(db_session, "acc_challenger_1")
    _store_stripe_rows(db_session, "acc_challenger_1", 2)
    pending = db_session.scalar(select(Transaction).where(Transaction.owner_account_id == "acc_challenger_1"))
    pending.is_excluded = True
    pending.excluded_reason = "pending"
    db_session.commit()

    summary = client.get("/api/connection", headers=CHALLENGER).json()

    assert summary["excluded_count"] == 1
    assert summary["excluded_reasons"] == ["pending"]


def test_import_ownership_conflict_returns_a_clean_client_error(client, db_session) -> None:
    # A record under Apex's fixture account already owned by another business makes run_import raise
    # StripeError. The route must answer with that message, not a 500, and keep nothing it half-imported.
    db_session.add(
        Transaction(
            owner_account_id="acc_owner_2",
            provider="fixture",
            provider_account_id="fixture_apex_main",
            provider_transaction_id="office-2026-08",
            source_type="fixture",
            raw_description="Office supplies",
            amount_minor=240000,
            currency="USD",
            direction="debit",
            posted_at=datetime(2026, 1, 1, tzinfo=UTC),
            status="posted",
            raw_payload="{}",
        )
    )
    db_session.commit()

    response = client.post("/api/connection/import", headers=OWNER)

    assert response.status_code == 400
    assert "another company" in response.json()["detail"]
    assert _count_rows(db_session, "fixture") == 1
