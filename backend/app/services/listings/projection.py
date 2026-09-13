"""Builds and serializes the additive public listing projection.
It never starts from a private object and removes fields later.
"""

import hashlib
import json

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.listings.current_price import resolve_current_price
from app.services.listings.types import PublicListingProjection, PublishChoices



def build_public_listing(
    listing: PublicListingRecord,
    expense: ServiceExpense,
    scope: ScopeVersion,
    choices: PublishChoices,
) -> PublicListingProjection:
    """Build the public listing field by field from safe source values."""

    current_price = resolve_current_price(expense, scope)
    return PublicListingProjection(
        id=listing.id,
        expense_id=expense.id,
        category=expense.category or "commercial_cleaning",
        scope_summary=_build_scope_summary(scope),
        required_tasks=_parse_tasks(scope.required_tasks),
        visit_frequency=scope.visit_frequency,
        supplies_included=scope.supplies_included,
        equipment_included=scope.equipment_included,
        taxes_included=scope.taxes_included,
        price_minor=current_price.amount.amount,
        price_currency=current_price.amount.currency,
        billing_cadence=current_price.cadence,
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
        required_tasks=_parse_tasks(record.required_tasks),
        visit_frequency=record.visit_frequency,
        supplies_included=record.supplies_included,
        equipment_included=record.equipment_included,
        taxes_included=record.taxes_included,
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
    required_tasks = _parse_tasks(scope.required_tasks)
    if required_tasks:
        parts.append(", ".join(required_tasks))
    return " · ".join(parts)


def _parse_tasks(stored_tasks: str | None) -> list[str]:
    # Stored as a JSON array (validated at the listings API boundary); a record from before the
    # column existed has None, which reads as no tasks recorded.
    return json.loads(stored_tasks) if stored_tasks else []
