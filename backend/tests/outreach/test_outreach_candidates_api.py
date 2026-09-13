"""Exercises manual candidates: boundary validation, duplicate detection, and removal rules."""

from tests.outreach.support import OWNER_HEADERS, approve, candidates_by_name, discover, preview, publish_cleaning_listing


def _add(client, listing_id: str, payload: dict):
    return client.post(f"/api/invitations/listings/{listing_id}/candidates", headers=OWNER_HEADERS, json=payload)


def test_manual_candidate_is_stored_as_owner_entered(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)

    response = _add(
        client,
        listing.id,
        {"business_name": "  Nob Hill Cleaning ", "contact_email": " Hello@NobHill.example ", "website_url": "nobhill.example", "phone": ""},
    )

    assert response.status_code == 200, response.text
    candidate = response.json()
    assert candidate["business_name"] == "Nob Hill Cleaning"
    assert candidate["contact_email"] == "hello@nobhill.example"
    assert candidate["website_url"] == "https://nobhill.example"
    assert candidate["phone"] is None
    assert (candidate["origin"], candidate["discovery_source"], candidate["provenance"]) == (
        "manually_added",
        "owner",
        "owner_entered",
    )
    assert (candidate["source_urls"], candidate["retrieved_at"]) == ([], None)
    assert candidate["eligibility"] == {"can_invite": True, "reason": None}


def test_invalid_input_is_rejected_at_the_boundary(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)

    bad_email = _add(client, listing.id, {"business_name": "Nob Hill Cleaning", "contact_email": "not-an-email"})
    header_injection = _add(client, listing.id, {"business_name": "Nob Hill\r\nBcc: victim@example.com"})
    blank_name = _add(client, listing.id, {"business_name": "   "})
    bad_website = _add(client, listing.id, {"business_name": "Nob Hill Cleaning", "website_url": "ftp://nobhill.example"})

    assert [response.status_code for response in (bad_email, header_injection, blank_name, bad_website)] == [422] * 4


def test_duplicate_of_a_discovered_provider_is_refused(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)

    by_domain = _add(client, listing.id, {"business_name": "BayClean", "website_url": "https://www.bayclean.example/about"})
    by_phone = _add(client, listing.id, {"business_name": "Harbor Light", "phone": "+1 (510) 555-0187"})

    assert by_domain.status_code == 409
    assert "Bay Clean Professional Services" in by_domain.json()["detail"]
    assert by_phone.status_code == 409


def test_candidate_can_be_removed_until_it_is_invited(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)
    candidates = candidates_by_name(client, listing.id)
    harbor_id = candidates["Harbor Light Facility Care"]["id"]
    bay_clean_id = candidates["Bay Clean Professional Services"]["id"]
    approve(client, listing.id, [bay_clean_id], preview(client, listing.id, [bay_clean_id])["message_hash"])

    removed = client.delete(f"/api/invitations/candidates/{harbor_id}", headers=OWNER_HEADERS)
    invited = client.delete(f"/api/invitations/candidates/{bay_clean_id}", headers=OWNER_HEADERS)

    assert removed.status_code == 204
    assert invited.status_code == 409
    remaining = candidates_by_name(client, listing.id)
    assert "Harbor Light Facility Care" not in remaining
    assert remaining["Bay Clean Professional Services"]["eligibility"]["reason"] == "Already invited"
    assert remaining["Bay Clean Professional Services"]["invitation_id"] is not None
