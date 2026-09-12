"""Builds and serializes the additive public listing projection.
It never starts from a private object and removes fields later.
"""

import hashlib
import json

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.listings.types import PublicListingProjection, PublishChoices



def build_public_listing(
    listing: PublicListingRecord,
    expense: ServiceExpense,
    scope: ScopeVersion,
    choices: PublishChoices,
) -> PublicListingProjection:
    """Build the public listing field by field from safe source values."""

    return PublicListingProjection(
        id=listing.id,
        expense_id=expense.id,
        category=expense.category or "commercial_cleaning",
        scope_summary=_build_scope_summary(scope),
        price_minor=expense.amount_minor_per_period,
        price_currency=expense.currency,
        billing_cadence=scope.billing_cadence or expense.cadence,
        service_area_approximate=scope.service_area or scope.location_approximate or "",
        bidding_mode=choices.bidding_mode,
        challenge_deadline=scope.challenge_deadline,
        incumbent_vendor_name=(
            scope.incumbent_vendor_name if choices.show_incumbent_vendor else None
        ),
        show_exact_address=choices.show_exact_address,
        visibility=listing.visibility,
        published_at=listing.published_at,
    )



def projection_from_record(record: PublicListingRecord) -> PublicListingProjection:
    """Serialize the stored public record without touching private expense data."""

    return PublicListingProjection(
        id=record.id,
        expense_id=record.expense_id,
        category=record.category,
        scope_summary=record.scope_summary,
        price_minor=record.price_minor,
        price_currency=record.price_currency,
        billing_cadence=record.billing_cadence,
        service_area_approximate=record.service_area_approximate,
        bidding_mode=record.bidding_mode,
        challenge_deadline=record.challenge_deadline,
        incumbent_vendor_name=record.incumbent_vendor_name,
        show_exact_address=record.show_exact_address,
        visibility=record.visibility,
        published_at=record.published_at,
    )



def build_payload_hash(projection: PublicListingProjection) -> str:
    """Return a stable hash of the exact public payload served for preview."""

    payload = json.dumps(projection.model_dump(mode="json"), sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _build_scope_summary(scope: ScopeVersion) -> str:
    parts = [
        scope.location_approximate or scope.service_area or "Location not specified",
        f"{scope.square_footage} sq ft" if scope.square_footage else "Square footage not specified",
        scope.visit_frequency or "Visit frequency not specified",
    ]
    if scope.required_tasks:
        parts.append(scope.required_tasks)
    return " · ".join(parts)
