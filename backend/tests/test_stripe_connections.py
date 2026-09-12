"""Exercise the sandbox workflow using HTTP-level mocked Stripe responses."""

from datetime import UTC, datetime

import httpx
import pytest
from sqlalchemy import func, select

from app.core.config import get_settings
from app.models import ServiceExpense, Transaction

OWNER = {"X-Account-ID": "acc_owner_1"}
OTHER = {"X-Account-ID": "acc_challenger_1"}
BASE = "/api/connections/stripe"


@pytest.fixture()
def stripe_api(monkeypatch):
    """Replace only Stripe HTTP transport, preserving real schema validation and services."""
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_example")
    get_settings.cache_clear()
    state = {
        "status": "succeeded",
        "transaction_status": "posted",
        "amount": -240000,
        "livemode": False,
        "failure": False,
        "calls": [],
        "company": "owner",
    }
    real_client = httpx.Client

    def respond(request):
        state["calls"].append(request)
        if state["failure"]:
            return httpx.Response(429, json={})
        company = state["company"]
        bank = {
            "id": f"fca_{company}",
            "livemode": state["livemode"],
            "account_holder": {"customer": f"cus_{company}"},
            "status": "active",
            "permissions": ["transactions"],
            "transaction_refresh": {
                "status": state["status"],
                "next_refresh_available_at": 0,
            },
        }
        path = request.url.path
        if path.endswith("/customers"):
            payload = {"id": f"cus_{company}", "livemode": False}
        elif "/sessions" in path:
            payload = {
                "id": f"fcsess_{company}",
                "livemode": False,
                "account_holder": {"customer": f"cus_{company}"},
                "client_secret": "test_secret",
                "accounts": {"data": [bank], "has_more": False},
            }
        elif path.endswith("/transactions"):
            second = "starting_after" in request.url.params
            payload = {
                "has_more": not second,
                "data": [
                    {
                        "id": "fctxn_2" if second else "fctxn_1",
                        "account": f"fca_{company}",
                        "livemode": state["livemode"],
                        "description": "ABC Cleaning",
                        "amount": state["amount"],
                        "currency": "usd",
                        "status": state["transaction_status"],
                        "transacted_at": 1788220800,
                        "updated": int(datetime.now(UTC).timestamp()),
                    }
                ],
            }
        else:
            payload = bank
        return httpx.Response(200, json=payload)

    def build(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(respond)
        return real_client(*args, **kwargs)

    monkeypatch.setattr("app.services.transactions.stripe.client.httpx.Client", build)
    return state


def connect(client):
    """Finish one company connection using a server-issued session."""
    response = client.post(BASE + "/session", headers=OWNER)
    assert response.status_code == 200, response.text
    response = client.post(
        BASE + "/complete", headers=OWNER, json={"session_id": "fcsess_owner"}
    )
    assert response.status_code == 200, response.text


def test_paginated_import_and_repeat_updates(client, db_session, stripe_api):
    connect(client)
    assert client.post(BASE + "/sync", headers=OWNER).json()["status"] == "succeeded"
    assert db_session.scalar(select(func.count()).select_from(Transaction)) == 2
    transaction = db_session.scalar(select(Transaction))
    assert transaction.amount_minor == 240000
    assert transaction.direction == "debit"
    assert transaction.source_type == "sandbox"
    expense = db_session.scalar(select(ServiceExpense))
    assert expense.visibility == "private"
    stripe_api["amount"] = -180000
    assert client.post(BASE + "/sync", headers=OWNER).status_code == 200
    db_session.expire_all()
    assert db_session.scalar(select(func.count()).select_from(Transaction)) == 2
    assert transaction.amount_minor == 180000
    stripe_api["transaction_status"] = "void"
    assert client.post(BASE + "/sync", headers=OWNER).status_code == 200
    db_session.expire_all()
    assert transaction.status == "void"
    assert expense.annualized_amount_minor == 0


def test_pending_refresh_and_transaction_do_not_create_spend(
    client, db_session, stripe_api
):
    connect(client)
    stripe_api["status"] = "pending"
    assert client.post(BASE + "/sync", headers=OWNER).json()["status"] == "pending"
    assert db_session.scalar(select(func.count()).select_from(Transaction)) == 0
    stripe_api["status"] = "succeeded"
    stripe_api["transaction_status"] = "pending"
    assert client.post(BASE + "/sync", headers=OWNER).status_code == 200
    assert db_session.scalar(select(func.count()).select_from(ServiceExpense)) == 0
    stripe_api["transaction_status"] = "posted"
    assert client.post(BASE + "/sync", headers=OWNER).status_code == 200
    assert db_session.scalar(select(func.count()).select_from(ServiceExpense)) == 1


def test_company_isolation_and_legacy_import_rejection(client, stripe_api):
    connect(client)
    assert (
        client.post(
            BASE + "/complete", headers=OTHER, json={"session_id": "fcsess_owner"}
        ).status_code
        == 400
    )
    assert client.post(BASE + "/sync", headers=OTHER).status_code == 400
    assert client.get(BASE, headers=OTHER).json()["connected"] is False
    # The client-chosen provider_account_id import route no longer exists (demo polish replaced it
    # with /api/connection/import, which resolves the account server-side and takes no body).
    assert (
        client.post(
            "/api/expenses/import",
            headers=OTHER,
            json={"provider_account_id": "fca_owner"},
        ).status_code
        == 405
    )
    assert (
        client.post("/api/connection/import", headers=OTHER, json={"provider_account_id": "fca_owner"}).status_code
        == 400
    )
    assert client.post(BASE + "/sync").status_code == 401


def test_live_responses_and_rate_limits_are_visible(client, stripe_api):
    connect(client)
    stripe_api["livemode"] = True
    assert client.post(BASE + "/sync", headers=OWNER).status_code == 400
    stripe_api["failure"] = True
    response = client.post(BASE + "/sync", headers=OWNER)
    assert "rate limit" in response.json()["detail"]


def test_live_secret_rejected_before_network(client, monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_live_example")
    get_settings.cache_clear()
    response = client.post(BASE + "/session", headers=OWNER)
    assert response.status_code == 400
    assert "sandbox key" in response.json()["detail"]


def test_two_companies_import_separate_bank_data(client, db_session, stripe_api):
    connect(client)
    assert client.post(BASE + "/sync", headers=OWNER).status_code == 200
    stripe_api["company"] = "other"
    stripe_api["amount"] = -50000
    assert client.post(BASE + "/session", headers=OTHER).status_code == 200
    assert (
        client.post(
            BASE + "/complete", headers=OTHER, json={"session_id": "fcsess_other"}
        ).status_code
        == 200
    )
    assert client.post(BASE + "/sync?refresh=true", headers=OTHER).status_code == 200
    assert db_session.scalar(select(func.count()).select_from(Transaction)) == 4
    owner_rows = client.get(BASE + "/transactions", headers=OWNER).json()
    other_rows = client.get(BASE + "/transactions", headers=OTHER).json()
    assert len(owner_rows) == len(other_rows) == 2
    assert {r["amount_minor"] for r in owner_rows} == {240000}
    assert {r["amount_minor"] for r in other_rows} == {50000}
    assert {r["id"] for r in owner_rows}.isdisjoint({r["id"] for r in other_rows})


def test_refresh_failure_is_visible_and_does_not_import(client, db_session, stripe_api):
    connect(client)
    stripe_api["status"] = "failed"
    assert client.post(BASE + "/sync", headers=OWNER).status_code == 400
    assert db_session.scalar(select(func.count()).select_from(Transaction)) == 0
