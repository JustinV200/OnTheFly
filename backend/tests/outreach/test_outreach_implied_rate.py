"""Covers the public-data-only implied rate and the three-recipient first outreach wave."""

from app.services.listings.types import PublicListingProjection, PublicRequirement
from app.services.outreach.rate import implied_rate_from_projection
from app.services.outreach.templates.body import build_invitation_body
from tests.outreach.support import OWNER_HEADERS, discover, publish_cleaning_listing
from tests.tasks.support import GOVCON, headers, listing_of, stage


def _projection(
    *,
    price_minor: int | None = 2_500_000,
    price_disclosed: bool = True,
    requirements: list[PublicRequirement] | None = None,
) -> PublicListingProjection:
    """Build the smallest representative public task projection for rate tests."""

    rows = requirements or [
        PublicRequirement(key="operate", text="Operate the service", priority="must", labor_category="Engineer", hours=200)
    ]
    return PublicListingProjection(
        id="listing-rate",
        expense_id=None,
        category="devsecops",
        scope_summary="Operate a secure cloud service",
        required_tasks=[],
        visit_frequency=None,
        supplies_included=None,
        equipment_included=None,
        taxes_included=None,
        price_minor=price_minor,
        price_currency="USD",
        billing_cadence="monthly",
        service_area_approximate="Virginia",
        bidding_mode="sealed",
        challenge_deadline=None,
        incumbent_vendor_name=None,
        show_exact_address=False,
        visibility="public",
        published_at=None,
        title="DevSecOps operations",
        requirements=rows,
        constraints=[],
        scope_fields=[],
        is_subcontract=False,
        price_disclosed=price_disclosed,
    )


def test_implied_rate_divides_public_price_by_period_hours_in_minor_units() -> None:
    rate = implied_rate_from_projection(_projection())

    assert rate.model_dump() == {
        "status": "available",
        "reason": None,
        "currency": "USD",
        "billing_cadence": "monthly",
        "price_minor": 2_500_000,
        "total_hours": 200,
        "rate_minor_per_hour": 12_500,
    }


def test_implied_rate_refuses_hidden_price_and_partial_must_have_hours() -> None:
    hidden = implied_rate_from_projection(_projection(price_minor=None, price_disclosed=False))
    incomplete = implied_rate_from_projection(
        _projection(
            requirements=[
                PublicRequirement(
                    key="operate",
                    text="Operate the service",
                    priority="must",
                    labor_category="Engineer",
                    hours=None,
                )
            ]
        )
    )

    assert hidden.status == "unavailable"
    assert hidden.reason == "Price is hidden; disclose it before sharing an implied rate."
    assert incomplete.status == "unavailable"
    assert incomplete.reason == "Confirm hours for every must-have requirement first."


def test_invitation_labels_the_rate_as_a_planning_estimate() -> None:
    projection = _projection()
    body = build_invitation_body(
        projection=projection,
        business_name="GovCon Industries",
        sender_name="On the Fly",
        recipient_name="Prime A",
        listing_url="https://example.test/listings/listing-rate",
        profile_url="https://example.test/p/govcon",
        footer="Footer",
        implied_rate=implied_rate_from_projection(projection),
    )

    assert "Current modeled implied rate: $125.00 per hour" in body
    assert "Based on 200 published hours per month" in body
    assert "planning estimate" in body
    assert "not a supplier quote or guaranteed award" in body


def test_overview_recommends_the_first_three_inviteable_candidates(client, db_session) -> None:
    listing = publish_cleaning_listing(db_session)
    discover(client, listing.id)

    response = client.get(f"/api/invitations/listings/{listing.id}", headers=OWNER_HEADERS)

    assert response.status_code == 200, response.text
    overview = response.json()
    eligible_ids = [candidate["id"] for candidate in overview["candidates"] if candidate["eligibility"]["can_invite"]]
    assert overview["recommended_candidate_ids"] == eligible_ids[:3]
    assert len(overview["recommended_candidate_ids"]) == 3
    assert overview["implied_rate"]["status"] == "unavailable"


def test_devsecops_preview_carries_the_same_implied_rate_as_its_email(client, db_session) -> None:
    chain = stage(db_session, "rebid_published")
    listing = listing_of(db_session, chain.rebid_task_id)
    candidate = client.post(
        f"/api/invitations/listings/{listing.id}/candidates",
        headers=headers(GOVCON),
        json={"business_name": "Example Bidder", "contact_email": "bids@example.test"},
    ).json()

    response = client.post(
        f"/api/invitations/listings/{listing.id}/preview",
        headers=headers(GOVCON),
        json={"candidate_ids": [candidate["id"]]},
    )

    assert response.status_code == 200, response.text
    previewed = response.json()
    assert previewed["implied_rate"]["status"] == "available"
    assert previewed["implied_rate"]["total_hours"] == 8240
    assert "Current modeled implied rate:" in previewed["messages"][0]["body_text"]
