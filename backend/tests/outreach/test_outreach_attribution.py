"""A challenge from the invited account, after the send, marks the invitation challenged; nothing else does."""

from app.services.challenges.submit import submit_challenge
from tests.outreach.support import OWNER_HEADERS, approve, candidates_by_name, discover, preview, publish_cleaning_listing


def _invite(client, listing_id: str, names: list[str]) -> None:
    candidates = candidates_by_name(client, listing_id)
    ids = [candidates[name]["id"] for name in names]
    response = approve(client, listing_id, ids, preview(client, listing_id, ids)["message_hash"])
    assert response.status_code == 200, response.text


def _invitations_by_name(client, listing_id: str) -> tuple[dict[str, dict], dict]:
    overview = client.get(f"/api/invitations/listings/{listing_id}", headers=OWNER_HEADERS).json()
    return {invitation["recipient_name"]: invitation for invitation in overview["invitations"]}, overview["summary"]


def test_invited_account_that_challenges_is_attributed_by_exact_email(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    _invite(client, listing.id, ["Bay Clean Professional Services", "Golden Gate Janitorial"])

    submit_challenge(listing.id, "acc_challenger_1", {"price_minor": 187500, "billing_frequency": "monthly"}, db_session)
    # Summit's account email is not Golden Gate's invited address, so its challenge proves nothing about that invite.
    submit_challenge(listing.id, "acc_challenger_3", {"price_minor": 199000, "billing_frequency": "monthly"}, db_session)
    invitations, summary = _invitations_by_name(client, listing.id)

    bay_clean = invitations["Bay Clean Professional Services"]
    assert (bay_clean["state"], bay_clean["display_state"]) == ("sent", "challenged")
    assert bay_clean["challenged_at"] is not None
    golden_gate = invitations["Golden Gate Janitorial"]
    assert (golden_gate["display_state"], golden_gate["challenged_at"]) == ("sent", None)
    assert summary["challenged"] == 1
    assert summary["sent"] == 2
    assert summary["delivery_tracked"] is False


def test_a_challenge_made_before_the_invitation_was_sent_is_not_attributed(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    submit_challenge(listing.id, "acc_challenger_2", {"price_minor": 195000, "billing_frequency": "monthly"}, db_session)
    discover(client, listing.id)

    _invite(client, listing.id, ["Golden Gate Janitorial"])
    invitations, summary = _invitations_by_name(client, listing.id)

    assert invitations["Golden Gate Janitorial"]["display_state"] == "sent"
    assert summary["challenged"] == 0
