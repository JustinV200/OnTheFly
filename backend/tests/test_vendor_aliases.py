"""Exercises FlyHash vendor alias suggestions and the owner actions that resolve them."""

from datetime import datetime, timezone

from sqlalchemy import func, select

from app.models.listing import ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.expenses.aliases import suggest_vendor_aliases
from app.services.transactions.import_run import run_import

PROVIDER_ACCOUNT_ID = "fixture_apex_main"
OWNER_HEADERS = {"X-Account-ID": "acc_owner_1"}


def _expense_row(vendor: str, category: str | None, period_count: int, is_eligible: bool = True) -> ServiceExpense:
    return ServiceExpense(
        owner_account_id="acc_owner_1",
        normalized_vendor=vendor,
        category=category,
        cadence="monthly",
        recurrence_confidence=1.0,
        amount_minor_per_period=240000,
        currency="USD",
        annualized_amount_minor=2880000,
        first_seen=datetime(2026, 1, 1, tzinfo=timezone.utc),
        last_seen=datetime(2026, 6, 1, tzinfo=timezone.utc),
        period_count=period_count,
        is_eligible=is_eligible,
        eligibility_reason="eligible" if is_eligible else "payroll",
        is_publishable=is_eligible,
        visibility="private",
    )


def _suggestions(client) -> list[dict]:
    response = client.get("/api/vendor-aliases", headers=OWNER_HEADERS)
    assert response.status_code == 200
    return response.json()["suggestions"]


def test_fixture_alias_descriptor_is_suggested_for_merge(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)

    response = client.get("/api/vendor-aliases", headers=OWNER_HEADERS)

    payload = response.json()
    assert len(payload["suggestions"]) == 1
    suggestion = payload["suggestions"][0]
    assert suggestion["alias"]["vendor"] == "Sparkle Cleaning Services LLC"
    assert suggestion["canonical"]["vendor"] == "Sparkle Clean"
    assert suggestion["name_similarity"] >= 0.6
    assert suggestion["shared_words"] == ["sparkle"]
    assert payload["fly_brain"][0]["component"] == "mushroom_body_flyhash"


def test_same_trade_word_alone_is_never_suggested(db_session) -> None:
    db_session.add_all([
        _expense_row("Sparkle Cleaning", "cleaning", 6),
        _expense_row("Bright Cleaning", "cleaning", 6),
    ])
    db_session.commit()

    assert suggest_vendor_aliases("acc_owner_1", db_session) == []


def test_contained_name_different_category_and_ineligible_groups(db_session) -> None:
    db_session.add_all([
        _expense_row("Orkin Pest Control", "pest_control", 6),
        _expense_row("Orkin", "pest_control", 1),
        _expense_row("Sparkle Clean", "cleaning", 6),
        _expense_row("Sparkle Clean Pest", "pest_control", 2),
        _expense_row("Gusto", "payroll", 6, is_eligible=False),
        _expense_row("Gusto Payroll", "payroll", 1, is_eligible=False),
    ])
    db_session.commit()

    pairs = {(item.alias.vendor, item.canonical.vendor) for item in suggest_vendor_aliases("acc_owner_1", db_session)}

    assert pairs == {("Orkin", "Orkin Pest Control")}


def test_merge_folds_the_alias_into_the_canonical_expense_and_persists(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    suggestion = _suggestions(client)[0]

    response = client.post(
        "/api/vendor-aliases/merge",
        headers=OWNER_HEADERS,
        json={
            "alias_expense_id": suggestion["alias"]["expense_id"],
            "canonical_expense_id": suggestion["canonical"]["expense_id"],
        },
    )

    assert response.status_code == 200
    merged = response.json()
    assert merged["vendor"] == "Sparkle Clean"
    assert merged["period_count"] == 13
    assert merged["amount_minor_per_period"] == 240000
    vendors = {expense["vendor"] for expense in client.get("/api/expenses", headers=OWNER_HEADERS).json()["expenses"]}
    assert "Sparkle Cleaning Services LLC" not in vendors

    # A re-import reapplies the stored corrections: still merged, nothing re-suggested.
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    assert _suggestions(client) == []
    assert db_session.scalar(
        select(func.count()).select_from(ServiceExpense).where(ServiceExpense.normalized_vendor.like("Sparkle%"))
    ) == 1


def test_merge_refuses_to_fold_away_an_expense_with_listing_history(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    suggestion = _suggestions(client)[0]
    db_session.add(ScopeVersion(expense_id=suggestion["alias"]["expense_id"], version_number=1))
    db_session.commit()

    response = client.post(
        "/api/vendor-aliases/merge",
        headers=OWNER_HEADERS,
        json={
            "alias_expense_id": suggestion["alias"]["expense_id"],
            "canonical_expense_id": suggestion["canonical"]["expense_id"],
        },
    )

    assert response.status_code == 400
    # The suggestion flips roles so the listed expense would be the one that survives.
    flipped = _suggestions(client)[0]
    assert flipped["canonical"]["expense_id"] == suggestion["alias"]["expense_id"]


def test_dismissed_pair_stays_dismissed_across_imports(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    suggestion = _suggestions(client)[0]
    pair = {
        "alias_expense_id": suggestion["alias"]["expense_id"],
        "canonical_expense_id": suggestion["canonical"]["expense_id"],
    }

    first = client.post("/api/vendor-aliases/dismiss", headers=OWNER_HEADERS, json=pair)
    reversed_pair = {
        "alias_expense_id": pair["canonical_expense_id"],
        "canonical_expense_id": pair["alias_expense_id"],
    }
    second = client.post("/api/vendor-aliases/dismiss", headers=OWNER_HEADERS, json=reversed_pair)

    assert first.status_code == 200
    assert second.status_code == 200
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    assert _suggestions(client) == []


def test_alias_actions_are_owner_scoped(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    suggestion = _suggestions(client)[0]
    pair = {
        "alias_expense_id": suggestion["alias"]["expense_id"],
        "canonical_expense_id": suggestion["canonical"]["expense_id"],
    }
    other = {"X-Account-ID": "acc_challenger_1"}

    assert client.get("/api/vendor-aliases", headers={}).status_code == 401
    assert client.get("/api/vendor-aliases", headers=other).json()["suggestions"] == []
    assert client.post("/api/vendor-aliases/merge", headers=other, json=pair).status_code == 404
    assert client.post("/api/vendor-aliases/dismiss", headers=other, json=pair).status_code == 404
