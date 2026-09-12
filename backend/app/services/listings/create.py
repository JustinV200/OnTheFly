"""Creates scope-confirmed listing drafts from private service expenses.
Draft creation does not publish anything; it only prepares the later preview flow.
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.visibility import ListingVisibility
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.models.visibility_audit import VisibilityAudit
from app.services.listings.projection import build_public_listing
from app.services.listings.types import PublishChoices



def create_listing_draft(
    expense: ServiceExpense,
    scope: ScopeVersion,
    choices: PublishChoices,
    db: Session,
) -> PublicListingRecord:
    """Create or update a scope-confirmed draft listing for one expense."""

    existing = db.scalar(
        select(PublicListingRecord).where(PublicListingRecord.expense_id == expense.id)
    )
    listing = existing or PublicListingRecord(
        id=str(uuid.uuid4()),
        expense_id=expense.id,
        owner_account_id=expense.owner_account_id,
    )
    if existing is None:
        db.add(listing)

    listing.scope_version_id = scope.id
    listing.visibility = ListingVisibility.scope_confirmed.value
    listing.bidding_mode = choices.bidding_mode
    listing.show_incumbent_vendor = choices.show_incumbent_vendor
    listing.show_exact_address = choices.show_exact_address

    projection = build_public_listing(listing, expense, scope, choices)
    listing.category = projection.category
    listing.scope_summary = projection.scope_summary
    listing.price_minor = projection.price_minor
    listing.price_currency = projection.price_currency
    listing.billing_cadence = projection.billing_cadence
    listing.service_area_approximate = projection.service_area_approximate
    listing.challenge_deadline = projection.challenge_deadline
    listing.incumbent_vendor_name = projection.incumbent_vendor_name

    previous_state = expense.visibility
    expense.visibility = ListingVisibility.scope_confirmed.value
    _write_audit(
        expense_id=expense.id,
        account_id=expense.owner_account_id,
        previous_state=previous_state,
        new_state=ListingVisibility.scope_confirmed.value,
        snapshot=projection.model_dump_json(),
        db=db,
    )
    db.flush()
    return listing



def build_scope_version(expense_id: str, payload: dict, db: Session) -> ScopeVersion:
    """Create the next scope version row for one expense from request data."""

    version_number = int(
        db.scalar(
            select(func.coalesce(func.max(ScopeVersion.version_number), 0)).where(
                ScopeVersion.expense_id == expense_id,
            )
        )
        or 0
    ) + 1
    scope = ScopeVersion(expense_id=expense_id, version_number=version_number, **payload)
    db.add(scope)
    db.flush()
    return scope


def _write_audit(
    expense_id: str,
    account_id: str,
    previous_state: str,
    new_state: str,
    snapshot: str | None,
    db: Session,
) -> None:
    db.add(
        VisibilityAudit(
            expense_id=expense_id,
            account_id=account_id,
            previous_state=previous_state,
            new_state=new_state,
            public_payload_snapshot=snapshot,
        )
    )
