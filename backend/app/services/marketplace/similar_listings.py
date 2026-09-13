"""Finds public listings with scope similar to one public listing, using a FlyHash index.
Only public listing records enter the index, so no private expense or draft can surface.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.visibility import ListingVisibility
from app.models.listing import PublicListingRecord
from app.services.flybrain import FlyHashIndex, MushroomBodyShape, build_flyhash
from app.services.listings.projection import projection_from_record
from app.services.listings.types import PublicListingProjection
from app.services.marketplace.listing_receptors import listing_scope_receptors, listing_scope_terms

LISTING_SHAPE = MushroomBodyShape(input_dim=1024, kenyon_cells=4000, fan_in=3, tag_size=200, seed=2018)

# Below this exact scope similarity a result is noise (e.g. sharing only the category).
MIN_SCOPE_SIMILARITY = 0.35
MAX_RESULTS = 5


@dataclass(frozen=True, slots=True)
class SimilarListing:
    """One similar public listing with the evidence for why it matched."""

    projection: PublicListingProjection
    similarity: float
    shared_terms: list[str]


@dataclass(frozen=True, slots=True)
class SimilarListingsResult:
    """The public listing the search started from and the listings found for it, best first.

    anchor is the public projection the query was encoded from, kept so callers can
    describe the search without querying or projecting the listing a second time.
    """

    anchor: PublicListingProjection
    listings: list[SimilarListing]


def find_similar_listings(
    listing_id: str,
    acting_account_id: str | None,
    db: Session,
) -> SimilarListingsResult | None:
    """Return listings similar to a public listing, best first; None when the listing isn't public.

    Excludes the listing itself and, when the viewer is known, the viewer's own
    listings (they can't bid on those). The index is rebuilt per request: public
    listings number in the hundreds here, and a stale cache could keep serving a
    listing after its owner unpublished it.
    """

    public_records = db.scalars(
        select(PublicListingRecord).where(PublicListingRecord.visibility == ListingVisibility.public.value)
    ).all()
    records_by_id = {record.id: record for record in public_records}
    anchor = records_by_id.get(listing_id)
    if anchor is None:
        return None

    # Encode from the public projection, not the record, so fields that exist only
    # on the stored record (owner, disclosure flags) can never reach the features.
    projections = {record.id: projection_from_record(record) for record in public_records}
    index: FlyHashIndex[str] = FlyHashIndex(build_flyhash(LISTING_SHAPE))
    for record_id, projection in projections.items():
        index.add(record_id, listing_scope_receptors(projection, LISTING_SHAPE.input_dim))

    excluded = {listing_id} | {
        record.id for record in public_records if acting_account_id and record.owner_account_id == acting_account_id
    }
    anchor_projection = projections[listing_id]
    matches = index.query(
        listing_scope_receptors(anchor_projection, LISTING_SHAPE.input_dim),
        limit=MAX_RESULTS,
        min_similarity=MIN_SCOPE_SIMILARITY,
        exclude=excluded,
    )
    return SimilarListingsResult(
        anchor=anchor_projection,
        listings=[
            SimilarListing(
                projection=projections[match.key],
                similarity=round(match.similarity, 2),
                shared_terms=_shared_terms(anchor_projection, projections[match.key]),
            )
            for match in matches
        ],
    )


def _shared_terms(left: PublicListingProjection, right: PublicListingProjection) -> list[str]:
    left_terms = listing_scope_terms(left)
    right_terms = listing_scope_terms(right)
    shared: list[str] = []
    for channel, terms in left_terms.items():
        shared.extend(sorted(set(terms) & set(right_terms.get(channel, []))))
    return shared
