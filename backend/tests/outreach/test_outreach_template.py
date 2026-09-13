"""Checks the rendered invitation: compliance is built in, it links to the public listing, and nothing private leaks."""

import pytest

from app.core.config import get_settings
from app.models.outreach import ProviderCandidate
from app.services.challenges.submit import submit_challenge
from app.services.outreach.templates import OPT_OUT_TOKEN_PLACEHOLDER
from tests.outreach.support import (
    INCUMBENT_NAME,
    PRIVATE_CANCELLATION_TERMS,
    PRIVATE_INSURANCE,
    PRIVATE_MINIMUM_TERM,
    candidates_by_name,
    discover,
    preview,
    publish_cleaning_listing,
)


@pytest.mark.parametrize("show_incumbent_vendor", [False, True])
def test_invitation_is_compliant_public_only_and_names_no_one_else(client, db_session, show_incumbent_vendor: bool) -> None:
    listing = publish_cleaning_listing(db_session, show_incumbent_vendor=show_incumbent_vendor)
    # Another challenger already bid; the invitation must not reveal that business.
    submit_challenge(listing.id, "acc_challenger_2", {"price_minor": 195000, "billing_frequency": "monthly"}, db_session)
    discover(client, listing.id)
    bay_clean = candidates_by_name(client, listing.id)["Bay Clean Professional Services"]

    message = preview(client, listing.id, [bay_clean["id"]])["messages"][0]
    body = message["body_text"]
    headers = message["headers"]

    listing_url = f"http://localhost:5173/listings/{listing.id}"
    assert listing_url in body
    assert f"{listing_url}?" not in body
    assert "http://localhost:5173/p/apex-facilities" in body
    assert "Offers are sealed: other bidders can't see your price." in body
    assert "$2,400.00 per month" in body
    assert "vacuum, trash, restrooms" in body

    # The compliance footer and headers are part of every render.
    assert "On the Fly · Postal address: not configured — real sending is blocked until OUTREACH_POSTAL_ADDRESS is set" in body
    # The owner's preview marks the opt-out link's place but never carries the recipient's token.
    stored = db_session.get(ProviderCandidate, bay_clean["id"])
    assert stored is not None
    redacted_opt_out = f"http://localhost:5173/opt-out/{OPT_OUT_TOKEN_PLACEHOLDER}"
    assert f"Don't want invitations? Opt out: {redacted_opt_out}" in body
    assert headers["List-Unsubscribe"] == f"<{redacted_opt_out}>"
    assert stored.opt_out_token not in body
    assert headers["From"] == "On the Fly <invitations@onthefly.example>"
    assert headers["To"] == "Bay Clean Professional Services <bids@bayclean.example>"
    assert headers["Subject"] == message["subject"]
    assert message["subject"] == "Apex Facilities Group is inviting offers: Commercial cleaning in San Francisco Bay Area"

    for private_text in (
        INCUMBENT_NAME,
        PRIVATE_CANCELLATION_TERMS,
        PRIVATE_INSURANCE,
        PRIVATE_MINIMUM_TERM,
        "bathroom",
        "SPARKLE",
        "4158881234",
        "Golden Gate Janitorial",
    ):
        assert private_text.casefold() not in body.casefold()
        assert private_text.casefold() not in message["subject"].casefold()


def test_configured_postal_address_and_base_url_reach_the_footer(client, db_session, monkeypatch: pytest.MonkeyPatch) -> None:
    listing = publish_cleaning_listing(db_session, bidding_mode="open")
    monkeypatch.setenv("OUTREACH_POSTAL_ADDRESS", "On the Fly Demo, 100 Example Way, Springfield, USA")
    monkeypatch.setenv("PUBLIC_APP_BASE_URL", "https://app.onthefly.test/")
    get_settings.cache_clear()
    discover(client, listing.id)
    golden_gate = candidates_by_name(client, listing.id)["Golden Gate Janitorial"]

    body = preview(client, listing.id, [golden_gate["id"]])["messages"][0]["body_text"]

    assert "On the Fly · On the Fly Demo, 100 Example Way, Springfield, USA" in body
    assert f"https://app.onthefly.test/listings/{listing.id}" in body
    assert "Open bidding: offer prices and scope are shown publicly. Other bidders never see who made an offer; the business does." in body
