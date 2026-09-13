"""Every owner outreach route answers 404 to any other account and 401 without one."""

import pytest

from tests.outreach.support import OWNER_HEADERS, candidates_by_name, discover, outreach_row_counts, publish_cleaning_listing


def _owner_routes(listing_id: str, candidate_id: str) -> list[tuple[str, str, dict | None]]:
    return [
        ("GET", f"/api/invitations/listings/{listing_id}", None),
        ("POST", f"/api/invitations/listings/{listing_id}/discover", None),
        ("POST", f"/api/invitations/listings/{listing_id}/candidates", {"business_name": "Sneaky Cleaning"}),
        ("DELETE", f"/api/invitations/candidates/{candidate_id}", None),
        ("POST", f"/api/invitations/listings/{listing_id}/preview", {"candidate_ids": [candidate_id]}),
        (
            "POST",
            f"/api/invitations/listings/{listing_id}/approve",
            {"candidate_ids": [candidate_id], "previewed_message_hash": "0" * 64},
        ),
        ("POST", f"/api/invitations/listings/{listing_id}/process-queue", None),
        ("GET", f"/api/invitations/listings/{listing_id}/outbox", None),
    ]


@pytest.mark.parametrize("other_account", ["acc_challenger_1", "acc_owner_2"])
def test_other_accounts_get_404_on_every_owner_route(client, db_session, other_account: str) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    candidate_id = candidates_by_name(client, listing.id)["Bay Clean Professional Services"]["id"]

    for method, path, body in _owner_routes(listing.id, candidate_id):
        response = client.request(method, path, headers={"X-Account-ID": other_account}, json=body)
        assert response.status_code == 404, f"{method} {path} returned {response.status_code}"

    assert outreach_row_counts(db_session) == (0, 0, 0)
    assert "Bay Clean Professional Services" in candidates_by_name(client, listing.id)
    assert "Sneaky Cleaning" not in candidates_by_name(client, listing.id)


def test_owner_routes_require_an_acting_account(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)

    for method, path, body in _owner_routes(listing.id, "candidate-1"):
        response = client.request(method, path, json=body)
        assert response.status_code == 401, f"{method} {path} returned {response.status_code}"
    assert client.get(f"/api/invitations/listings/{listing.id}", headers=OWNER_HEADERS).status_code == 200
