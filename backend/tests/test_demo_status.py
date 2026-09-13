"""Exercises the public demo-seams endpoint that labels simulated data on screen."""

from datetime import datetime, timezone
import json

from app.core.config import get_settings
from app.models.account import Account
from app.models.challenge import Challenge
from app.services.challenges.submit import submit_challenge
from tests.test_challenges import _create_public_listing


def test_status_is_public_and_reports_fixture_data_and_no_offers(client, db_session) -> None:
    _create_public_listing(db_session)

    response = client.get("/api/demo/status")

    assert response.status_code == 200
    assert response.json()["financial"]["provenance"] == ["fixture"]
    assert response.json()["financial"]["has_production_data"] is False
    assert response.json()["offers"] == {
        "total": 0,
        "genuine": 0,
        "captured_off_platform": 0,
        "demo": 0,
        "all_simulated": True,
    }
    assert response.json()["outreach"] == {
        "channel": "sandbox",
        "channel_label": "Sandbox outbox — no email leaves this machine",
        "delivers_real_email": False,
    }


def test_status_says_when_invitations_would_be_real_email(client, db_session, monkeypatch) -> None:
    monkeypatch.setenv("OUTREACH_CHANNEL", "smtp")
    get_settings.cache_clear()

    outreach = client.get("/api/demo/status").json()["outreach"]

    assert outreach["channel"] == "smtp"
    assert outreach["delivers_real_email"] is True


def test_offers_from_seeded_accounts_count_as_simulated(client, db_session) -> None:
    listing = _create_public_listing(db_session)
    submit_challenge(listing.id, "acc_challenger_1", {"price_minor": 187500, "billing_frequency": "monthly"}, db_session)

    offers = client.get("/api/demo/status").json()["offers"]

    assert offers["total"] == 1
    assert offers["genuine"] == 0
    assert offers["all_simulated"] is True


def test_a_captured_off_platform_offer_counts_as_genuine(client, db_session) -> None:
    listing = _create_public_listing(db_session)
    db_session.add(
        Account(id="acc_real_1", handle="real-cleaner", business_name="Real Cleaner Co", service_area="SF")
    )
    db_session.add(
        Challenge(
            listing_id=listing.id,
            scope_version_id=listing.scope_version_id,
            challenger_account_id="acc_real_1",
            bidding_mode_at_submission="sealed",
            price_minor=190000,
            billing_frequency="monthly",
            scope_included=json.dumps([]),
            scope_excluded="[]",
            scope_extras="[]",
            provenance="captured_off_platform",
            submitted_at=datetime(2026, 9, 10, tzinfo=timezone.utc),
        )
    )
    db_session.commit()

    offers = client.get("/api/demo/status").json()["offers"]

    assert offers["genuine"] == 1
    assert offers["captured_off_platform"] == 1
    assert offers["all_simulated"] is False
