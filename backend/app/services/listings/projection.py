"""Builds and serializes the additive public listing projection.
It never starts from a private object and removes fields later.
"""

import hashlib
import json

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.services.listings.current_price import resolve_current_price
from app.services.listings.types import (
    PublicConstraint,
    PublicListingProjection,
    PublicRequirement,
    PublicScopeField,
    PublishChoices,
)
from app.services.scope.public_content import PublicScopeContent
from app.services.scope.summary import summarize_requirements



def build_public_listing(
    listing: PublicListingRecord,
    expense: ServiceExpense,
    scope: ScopeVersion,
    choices: PublishChoices,
    content: PublicScopeContent | None = None,
) -> PublicListingProjection:
    """Build a rebid listing's public projection field by field from safe source values.

    content carries the scope version's requirement rows, constraints and template fields when it has them
    (services/scope/public_content.py); a cleaning scope without rows passes None and publishes as before.
    """

    current_price = resolve_current_price(expense, scope)
    area = scope.service_area or scope.location_approximate or ""
    has_rows = content is not None and bool(content.requirements)
    return PublicListingProjection(
        id=listing.id,
        expense_id=expense.id,
        # The owner's category correction wins, as on the dashboard; "cleaning" was the MVP's one category key.
        category=expense.owner_corrected_category or expense.category or "cleaning",
        scope_summary=(
            summarize_requirements(area, content.requirements, content.constraints)
            if content is not None and has_rows
            else _build_scope_summary(scope)
        ),
        required_tasks=_parse_tasks(scope.required_tasks),
        visit_frequency=scope.visit_frequency,
        supplies_included=scope.supplies_included,
        equipment_included=scope.equipment_included,
        taxes_included=scope.taxes_included,
        price_minor=current_price.amount.amount,
        price_currency=current_price.amount.currency,
        billing_cadence=current_price.cadence,
        service_area_approximate=area,
        bidding_mode=choices.bidding_mode,
        challenge_deadline=scope.challenge_deadline,
        incumbent_vendor_name=(
            scope.incumbent_vendor_name if choices.show_incumbent_vendor else None
        ),
        show_exact_address=choices.show_exact_address,
        visibility=listing.visibility,
        published_at=listing.published_at,
        title=content.title if content is not None else None,
        requirements=list(content.requirements) if content is not None else [],
        constraints=list(content.constraints) if content is not None else [],
        scope_fields=list(content.scope_fields) if content is not None else [],
        # A rebid is never a subcontract, and keeps showing its price (plan2, "Price display").
        is_subcontract=False,
        price_disclosed=True,
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
        title=record.title,
        requirements=[PublicRequirement.model_validate(item) for item in _parse_list(record.requirements_json)],
        constraints=[PublicConstraint.model_validate(item) for item in _parse_list(record.constraints_json)],
        scope_fields=[PublicScopeField.model_validate(item) for item in _parse_list(record.scope_fields_json)],
        is_subcontract=bool(record.is_subcontract),
        # A record from before the column existed was always shown with its price.
        price_disclosed=record.show_price is not False,
    )



def build_payload_hash(projection: PublicListingProjection) -> str:
    """Return a stable hash of the exact public payload served for preview."""

    payload = json.dumps(projection.model_dump(mode="json"), sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def persist_projection(listing: PublicListingRecord, projection: PublicListingProjection) -> None:
    """Copy a projection onto the stored public record, field by field, so the record serves exactly that payload."""

    listing.category = projection.category
    listing.scope_summary = projection.scope_summary
    listing.required_tasks = json.dumps(projection.required_tasks)
    listing.visit_frequency = projection.visit_frequency
    listing.supplies_included = projection.supplies_included
    listing.equipment_included = projection.equipment_included
    listing.taxes_included = projection.taxes_included
    listing.price_minor = projection.price_minor
    listing.price_currency = projection.price_currency
    listing.billing_cadence = projection.billing_cadence
    listing.service_area_approximate = projection.service_area_approximate
    listing.bidding_mode = projection.bidding_mode
    listing.challenge_deadline = projection.challenge_deadline
    listing.incumbent_vendor_name = projection.incumbent_vendor_name
    listing.show_exact_address = projection.show_exact_address
    listing.visibility = projection.visibility
    listing.published_at = projection.published_at
    listing.title = projection.title
    listing.requirements_json = json.dumps([item.model_dump() for item in projection.requirements])
    listing.constraints_json = json.dumps([item.model_dump() for item in projection.constraints])
    listing.scope_fields_json = json.dumps([item.model_dump() for item in projection.scope_fields])
    listing.is_subcontract = projection.is_subcontract
    listing.show_price = projection.price_disclosed


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


def _parse_list(stored: str | None) -> list[object]:
    # The roadmap 12 JSON columns are written only by persist_projection; None predates them and reads as empty.
    parsed = json.loads(stored) if stored else []
    return parsed if isinstance(parsed, list) else []
