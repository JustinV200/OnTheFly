"""Exercises the owner-only trace from potential savings down to individual transactions."""

from app.services.challenges.submit import submit_challenge
from tests.test_challenges import _create_public_listing

FULL_SCOPE = ["vacuum", "trash", "restrooms", "3x weekly", "equipment"]


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
