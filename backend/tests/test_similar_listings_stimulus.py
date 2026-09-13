"""Checks the brain stimulus on similar listings: public scope codes only, the anchor first, generic captions."""

from app.services.flybrain import SensoryInput, StimulusInput
from app.services.flybrain.brain_stimulus import GAP_MS, PULSE_MS, TAIL_MS, build_pulse
from app.services.listings.projection import projection_from_record
from app.services.listings.types import PublicListingProjection
from app.services.marketplace import find_similar_listings
from app.services.marketplace.listing_receptors import listing_scope_receptors
from app.services.marketplace.similar_listings import LISTING_SHAPE
from tests.test_similar_listings import OFFICE_SCOPE, _listing

SLOT_MS = PULSE_MS + GAP_MS
CLOSE_SCOPES = [
    "Oakland, CA · 7500 sq ft · 3x weekly · vacuum, trash, restrooms",
    "Berkeley, CA · 8200 sq ft · 3x weekly · vacuum, trash, restrooms",
    "San Jose, CA · 7800 sq ft · 3x weekly · vacuum, trash, restrooms",
    "Fremont, CA · 8000 sq ft · 3x weekly · vacuum, trash, restrooms",
]


def _expected_pulse(caption: str, projection: PublicListingProjection, start_ms: int) -> dict:
    vector = listing_scope_receptors(projection, LISTING_SHAPE.input_dim)
    pulse = build_pulse(StimulusInput(SensoryInput.olfactory, caption, vector), LISTING_SHAPE.input_dim, start_ms)
    assert pulse is not None
    return pulse.model_dump(mode="json")


def test_stimulus_plays_the_anchor_then_at_most_three_matches(client, db_session) -> None:
    anchor = _listing(db_session, "acc_owner_1", OFFICE_SCOPE)
    for index, scope in enumerate(CLOSE_SCOPES):
        _listing(db_session, f"acc_challenger_{index + 1}", scope)

    payload = client.get(f"/api/marketplace/{anchor.id}/similar").json()
    stimulus = payload["brain_stimulus"]

    assert len(payload["listings"]) == 4
    assert stimulus["result_label"] == "Similar listings"
    assert stimulus["circuits"] == ["mushroom_body_flyhash"]
    assert stimulus["receptor_count"] == LISTING_SHAPE.input_dim
    assert [pulse["caption"] for pulse in stimulus["pulses"]] == [
        "Listing you're viewing",
        "Similar listing 1",
        "Similar listing 2",
        "Similar listing 3",
    ]
    assert [pulse["start_ms"] for pulse in stimulus["pulses"]] == [0, SLOT_MS, 2 * SLOT_MS, 3 * SLOT_MS]
    assert {pulse["sense"] for pulse in stimulus["pulses"]} == {"olfactory"}
    assert stimulus["duration_ms"] == 3 * SLOT_MS + PULSE_MS + TAIL_MS

    # The anchor pulse is the builder applied to the anchor's public projection, and each match
    # pulse is the builder applied to the public listing returned beside it, in result order.
    assert stimulus["pulses"][0] == _expected_pulse("Listing you're viewing", projection_from_record(anchor), 0)
    for position, item in enumerate(payload["listings"][:3], start=1):
        projection = PublicListingProjection.model_validate(item["listing"])
        assert stimulus["pulses"][position] == _expected_pulse(f"Similar listing {position}", projection, position * SLOT_MS)


def test_captions_carry_no_listing_text_or_price(client, db_session) -> None:
    anchor = _listing(db_session, "acc_owner_1", OFFICE_SCOPE, price_minor=240000)
    _listing(db_session, "acc_challenger_2", CLOSE_SCOPES[0], price_minor=187500)

    payload = client.get(f"/api/marketplace/{anchor.id}/similar").json()
    captions = " ".join(pulse["caption"] for pulse in payload["brain_stimulus"]["pulses"]).casefold()

    listing_text = [OFFICE_SCOPE, CLOSE_SCOPES[0], "San Francisco Bay Area", "240000", "2,400", "187500", "1,875"]
    words = {word.strip(",").casefold() for text in listing_text for word in text.split() if len(word.strip(",")) > 2}
    assert not [word for word in words if word in captions]


def test_private_and_own_listings_never_feed_the_stimulus(client, db_session) -> None:
    anchor = _listing(db_session, "acc_owner_1", OFFICE_SCOPE)
    _listing(db_session, "acc_challenger_2", OFFICE_SCOPE, visibility="private")
    _listing(db_session, "acc_challenger_3", OFFICE_SCOPE)

    payload = client.get(
        f"/api/marketplace/{anchor.id}/similar",
        headers={"X-Account-ID": "acc_challenger_3"},
    ).json()

    # The only public match belongs to the viewer and the other is private, so only the anchor plays.
    assert payload["listings"] == []
    assert [pulse["caption"] for pulse in payload["brain_stimulus"]["pulses"]] == ["Listing you're viewing"]
    assert payload["brain_stimulus"]["duration_ms"] == PULSE_MS + TAIL_MS


def test_endpoint_results_match_the_service_after_the_result_shape_change(client, db_session) -> None:
    anchor = _listing(db_session, "acc_owner_1", OFFICE_SCOPE)
    for index, scope in enumerate(CLOSE_SCOPES[:2]):
        _listing(db_session, f"acc_challenger_{index + 1}", scope)

    payload = client.get(f"/api/marketplace/{anchor.id}/similar").json()
    result = find_similar_listings(anchor.id, None, db_session)

    assert result is not None
    assert result.anchor == projection_from_record(anchor)
    assert [
        (item["listing"]["id"], item["scope_similarity"], item["shared_terms"]) for item in payload["listings"]
    ] == [(item.projection.id, item.similarity, item.shared_terms) for item in result.listings]
    assert payload["message"] is None
    assert payload["fly_brain"][0]["component"] == "mushroom_body_flyhash"
