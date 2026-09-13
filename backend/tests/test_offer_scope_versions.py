"""Offers stay scored against the scope version they answered, and a foreign-currency row never breaks a view.
CLAUDE.md, marketplace mechanics: editing scope never retroactively reframes an existing offer.
"""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.challenge import Challenge
from app.models.service_expense import ServiceExpense
from app.services.transactions.import_run import run_import

OWNER = {"X-Account-ID": "acc_owner_1"}
SCOPE_V1 = {
    "service_area": "San Francisco Bay Area",
    "visit_frequency": "3x weekly",
    "required_tasks": ["vacuum", "trash"],
    "current_price_minor": 240000,
    "billing_cadence": "monthly",
}
SCOPE_V2 = {
    "service_area": "San Francisco Bay Area",
    "visit_frequency": "5x weekly",
    "required_tasks": ["vacuum", "trash", "windows"],
    "current_price_minor": 210000,
    "billing_cadence": "monthly",
}


def _import_sparkle_clean(db_session: Session) -> str:
    run_import("acc_owner_1", "fixture_apex_main", db_session)
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == "Sparkle Clean"))
    assert expense is not None
    return expense.id


def _publish(client: TestClient, expense_id: str, scope: dict) -> str:
    """Publish (or re-scope and republish) the expense's listing through the owner's own API flow."""

    draft = client.post(
        "/api/listings",
        headers=OWNER,
        json={"expense_id": expense_id, "scope": scope, "choices": {"bidding_mode": "open"}},
    )
    assert draft.status_code == 200, draft.text
    listing_id = draft.json()["listing_id"]
    preview = client.get(f"/api/listings/{listing_id}/preview", headers=OWNER).json()
    published = client.post(
        f"/api/listings/{listing_id}/publish",
        headers=OWNER,
        json={"previewed_payload_hash": preview["payload_hash"]},
    )
    assert published.status_code == 200, published.text
    return listing_id


def _offer(client: TestClient, listing_id: str, account_id: str, price_minor: int, scope_included: list[str]) -> str:
    response = client.post(
        f"/api/listings/{listing_id}/challenges",
        headers={"X-Account-ID": account_id},
        json={
            "price_minor": price_minor,
            "billing_frequency": "monthly",
            "scope_included": scope_included,
            "acknowledged_bidding_mode": "open",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def _snapshot(client: TestClient, listing_id: str, challenge_id: str) -> dict:
    """The figures an unrevised offer shows everywhere it appears; none of them may move on a re-scope."""

    board = client.get(f"/api/listings/{listing_id}/leaderboard").json()
    inbox = client.get(f"/api/listings/{listing_id}/inbox", headers=OWNER).json()
    comparison = client.get(f"/api/listings/{listing_id}/comparison", headers=OWNER).json()
    trace = client.get(f"/api/challenges/{challenge_id}/trace", headers=OWNER).json()
    board_entry = next(entry for entry in board["entries"] if entry["challenge_id"] == challenge_id)
    inbox_row = next(row for row in inbox["challenges"] if row["challenge_id"] == challenge_id)
    comparison_row = next(row for row in comparison["rows"] if row["challenge_id"] == challenge_id)
    return {
        "board_completeness": board_entry["scope_completeness"],
        "inbox_completeness": inbox_row["scope_completeness"],
        "inbox_missing": inbox_row["missing_items"],
        "inbox_unstated": inbox_row["unstated_items"],
        "inbox_savings": inbox_row["savings"],
        "comparison_completeness": comparison_row["scope_completeness"],
        "comparison_missing": comparison_row["missing_items"],
        "comparison_savings": comparison_row["savings"],
        "trace_completeness": trace["offer"]["scope_completeness"],
        "trace_missing": trace["offer"]["missing_items"],
        "trace_savings": trace["savings"],
        "trace_baseline_minor": trace["baseline"]["amount_minor"],
        "trace_baseline_version": trace["baseline"]["confirmed_on_scope_version"],
    }


def test_rescoping_a_listing_does_not_reframe_an_unrevised_offer(client, db_session) -> None:
    expense_id = _import_sparkle_clean(db_session)
    listing_id = _publish(client, expense_id, SCOPE_V1)
    old_offer = _offer(client, listing_id, "acc_challenger_1", 200000, ["vacuum", "trash", "3x weekly"])
    before = _snapshot(client, listing_id, old_offer)

    assert client.post(f"/api/listings/{listing_id}/unpublish", headers=OWNER).status_code == 200
    assert _publish(client, expense_id, SCOPE_V2) == listing_id
    after = _snapshot(client, listing_id, old_offer)

    assert before["inbox_completeness"] == 1.0
    assert before["inbox_savings"]["annual_recurring_savings_minor"] == (240000 - 200000) * 12
    assert after == before


def test_offers_on_the_current_scope_rank_ahead_of_offers_on_an_earlier_one(client, db_session) -> None:
    expense_id = _import_sparkle_clean(db_session)
    listing_id = _publish(client, expense_id, SCOPE_V1)
    old_offer = _offer(client, listing_id, "acc_challenger_1", 200000, ["vacuum", "trash", "3x weekly"])
    client.post(f"/api/listings/{listing_id}/unpublish", headers=OWNER)
    _publish(client, expense_id, SCOPE_V2)
    # Dearer than the old offer, but it's the only one priced against the scope the owner wants now.
    new_offer = _offer(client, listing_id, "acc_challenger_2", 205000, ["vacuum", "trash", "windows", "5x weekly"])

    board = client.get(f"/api/listings/{listing_id}/leaderboard").json()
    inbox = client.get(f"/api/listings/{listing_id}/inbox", headers=OWNER).json()
    comparison = client.get(f"/api/listings/{listing_id}/comparison", headers=OWNER).json()
    trace = client.get(f"/api/challenges/{old_offer}/trace", headers=OWNER).json()

    assert board["current_scope_version_number"] == 2
    assert [(entry["challenge_id"], entry["answered_scope_version_number"], entry["is_current_scope_version"]) for entry in board["entries"]] == [
        (new_offer, 2, True),
        (old_offer, 1, False),
    ]
    assert inbox["current_scope_version_number"] == 2
    assert [(row["challenge_id"], row["answered_scope_version_number"], row["is_current_scope_version"]) for row in inbox["challenges"]] == [
        (new_offer, 2, True),
        (old_offer, 1, False),
    ]
    # The incumbent row keeps today's price; each offer's savings use the price on the version it answered.
    incumbent, first, second = comparison["rows"]
    assert incumbent["is_incumbent"] is True
    assert incumbent["normalized_price_minor"] == 210000
    assert (first["challenge_id"], first["baseline_monthly_minor"]) == (new_offer, 210000)
    assert (second["challenge_id"], second["baseline_monthly_minor"]) == (old_offer, 240000)
    assert second["is_current_scope_version"] is False
    assert trace["scope_version"]["version_number"] == 1
    assert trace["scope_version"]["is_listing_current_version"] is False
    assert trace["listing"]["current_scope_version_number"] == 2
    assert trace["savings"]["baseline_monthly_minor"] == 240000


def test_an_offer_in_another_currency_is_listed_unranked_instead_of_failing_the_inbox(client, db_session) -> None:
    """A mismatched row that already exists must degrade to "not ranked", never a 500 for every offer."""

    expense_id = _import_sparkle_clean(db_session)
    listing_id = _publish(client, expense_id, SCOPE_V1)
    usd_offer = _offer(client, listing_id, "acc_challenger_1", 200000, ["vacuum", "trash", "3x weekly"])
    foreign_offer = _offer(client, listing_id, "acc_challenger_2", 100, ["vacuum", "trash", "3x weekly"])
    # Written straight to the row: submission pins currency server-side now, but older rows may still differ.
    stored = db_session.get(Challenge, foreign_offer)
    assert stored is not None
    stored.price_currency = "EUR"
    db_session.commit()

    inbox = client.get(f"/api/listings/{listing_id}/inbox", headers=OWNER)
    comparison = client.get(f"/api/listings/{listing_id}/comparison", headers=OWNER)
    trace = client.get(f"/api/challenges/{foreign_offer}/trace", headers=OWNER)
    board = client.get(f"/api/listings/{listing_id}/leaderboard")

    assert inbox.status_code == 200, inbox.text
    assert comparison.status_code == 200, comparison.text
    assert trace.status_code == 200, trace.text
    assert board.status_code == 200, board.text
    usd_row, foreign_row = inbox.json()["challenges"]
    assert usd_row["challenge_id"] == usd_offer
    assert usd_row["unranked_reason"] is None
    assert usd_row["savings"] is not None
    assert foreign_row["challenge_id"] == foreign_offer
    assert foreign_row["savings"] is None
    assert "currency" in foreign_row["unranked_reason"]
    assert comparison.json()["rows"][-1]["savings"] is None
    assert trace.json()["savings"] is None
    assert "currency" in trace.json()["offer"]["unranked_reason"]
    # EUR 1.00 must not outrank USD 2,000 on the public board: it sits apart, unranked.
    usd_entry, foreign_entry = board.json()["entries"]
    assert (usd_entry["challenge_id"], usd_entry["unranked_reason"]) == (usd_offer, None)
    assert foreign_entry["challenge_id"] == foreign_offer
    assert "currency" in foreign_entry["unranked_reason"]
