"""Describes the scope codes FlyHash compared for a similar-listings search, for the live fly-brain panel.
It encodes only public projections already in the search result, with the encoder and input size the index used.
"""

from app.services.flybrain import BrainStimulus, FlyBrainComponent, SensoryInput, StimulusInput, build_brain_stimulus
from app.services.listings.types import PublicListingProjection
from app.services.marketplace.listing_receptors import listing_scope_receptors
from app.services.marketplace.similar_listings import LISTING_SHAPE, SimilarListingsResult

# The anchor takes the first slot, then this many matches in result order; the rest of
# the results are left out so a replay stays short.
MATCHES_IN_STIMULUS = 3


def similar_listings_stimulus(result: SimilarListingsResult) -> BrainStimulus | None:
    """Return the anchor's scope code, then up to MATCHES_IN_STIMULUS matches', one slot each.

    Public like the endpoint it serves: every vector comes from a public projection, and
    captions are fixed words, never a listing's title, scope, area, or price.
    """

    slots = [[_scope_input("Listing you're viewing", result.anchor)]]
    slots.extend(
        [_scope_input(f"Similar listing {position}", item.projection)]
        for position, item in enumerate(result.listings[:MATCHES_IN_STIMULUS], start=1)
    )
    return build_brain_stimulus(
        "Similar listings",
        [FlyBrainComponent.mushroom_body_flyhash],
        LISTING_SHAPE.input_dim,
        slots,
    )


def _scope_input(caption: str, projection: PublicListingProjection) -> StimulusInput:
    # The same call find_similar_listings indexes and queries with, so the pulse is the code FlyHash read.
    return StimulusInput(
        sense=SensoryInput.olfactory,
        caption=caption,
        vector=listing_scope_receptors(projection, LISTING_SHAPE.input_dim),
    )
