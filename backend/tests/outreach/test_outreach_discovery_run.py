"""Exercises fixture discovery through the API: filtering counts, provenance on every candidate, and that nothing sends."""

from sqlalchemy import func, select

from app.models.outreach import DiscoveryRun, ProviderCandidate
from app.services.listings.visibility import unpublish_listing
from tests.outreach.support import (
    OWNER_HEADERS,
    OWNER_ID,
    candidates_by_name,
    discover,
    outreach_row_counts,
    publish_cleaning_listing,
)


def test_discovery_drops_aggregators_merges_duplicates_and_records_provenance(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)

    run = discover(client, listing.id)

    assert run["status"] == "ok"
    assert run["source"] == "fixture"
    assert "fictional" in run["source_label"]
    assert run["found_count"] == 8
    assert run["dropped_aggregator_count"] > 0
    assert run["merged_duplicate_count"] > 0
    assert run["new_candidate_count"] == 6
    assert all("sparkle" not in query.casefold() for query in run["queries"])

    candidates = candidates_by_name(client, listing.id)
    assert "Top 10 Commercial Cleaning Services in San Francisco, CA" not in candidates
    for candidate in candidates.values():
        assert candidate["origin"] == "discovered"
        assert candidate["provenance"] == "demo_data"
        assert candidate["retrieved_at"] is not None
        assert candidate["source_urls"]
    assert len(candidates["Bay Clean Professional Services"]["source_urls"]) == 3
    assert candidates["Harbor Light Facility Care"]["eligibility"] == {
        "can_invite": False,
        "reason": "No published contact email",
    }


def test_discovery_and_adding_candidates_never_create_or_send_invitations(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)

    discover(client, listing.id)
    discover(client, listing.id)
    response = client.post(
        f"/api/invitations/listings/{listing.id}/candidates",
        headers=OWNER_HEADERS,
        json={"business_name": "Nob Hill Cleaning", "contact_email": "Hello@NobHill.example"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["contact_email"] == "hello@nobhill.example"
    assert outreach_row_counts(db_session) == (0, 0, 0)


def test_rediscovery_keeps_one_row_per_provider_and_never_overwrites_a_manual_entry(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    manual = client.post(
        f"/api/invitations/listings/{listing.id}/candidates",
        headers=OWNER_HEADERS,
        json={"business_name": "Bay Clean (met at trade show)", "website_url": "bayclean.example", "contacted_off_platform": True},
    )
    assert manual.status_code == 200, manual.text

    first = discover(client, listing.id)
    second = discover(client, listing.id)

    assert first["new_candidate_count"] == 5
    assert second["new_candidate_count"] == 0
    assert db_session.scalar(select(func.count()).select_from(ProviderCandidate)) == 6
    assert db_session.scalar(select(func.count()).select_from(DiscoveryRun)) == 2
    stored_manual = candidates_by_name(client, listing.id)["Bay Clean (met at trade show)"]
    assert stored_manual["origin"] == "manually_added"
    assert stored_manual["contact_email"] is None
    assert stored_manual["retrieved_at"] is None


def test_discovery_on_a_private_listing_is_refused(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    unpublish_listing(listing.id, OWNER_ID, db_session)

    response = client.post(f"/api/invitations/listings/{listing.id}/discover", headers=OWNER_HEADERS)

    assert response.status_code == 400
    assert "not public" in response.json()["detail"]
    assert db_session.scalar(select(func.count()).select_from(DiscoveryRun)) == 0
