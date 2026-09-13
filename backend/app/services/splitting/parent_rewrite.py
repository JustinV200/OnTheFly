"""Rewrites a buyer's parent listing when it splits before acceptance, and restores it on undo.
The parent gets a new scope version (never an edit), and its listing returns to review until the buyer republishes.
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.visibility import ListingVisibility
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.scope import Requirement
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task
from app.services.listings.audit import write_visibility_audit
from app.services.listings.create import create_listing_draft
from app.services.listings.projection import persist_projection
from app.services.listings.types import PublishChoices
from app.services.scope.requirements import RequirementInput, requirement_to_input
from app.services.tasks.listing.publish import build_task_projection
from app.services.tasks.scope.parent_scope_flags import flag_pieces_after_parent_change
from app.services.tasks.scope.write_version import ScopeVersionContent, content_of_version, write_task_scope_version
from app.services.tasks.state_sync import sync_task_state


def write_parent_without(
    parent: Task,
    listing: PublicListingRecord,
    current: ScopeVersion,
    removed_keys: Sequence[str],
    price_change_minor: int,
    acting_account_id: str,
    except_child_task_id: str,
    db: Session,
) -> ScopeVersion:
    """Write the parent's next version without removed_keys and with its price changed by price_change_minor.

    Used with a negative change when splitting and a positive one on undo (see write_parent_with). The listing
    returns to scope confirmed: its public terms changed, so the buyer previews and republishes it.
    """

    content = content_of_version(current, db)
    content.requirements = [item for item in content.requirements if item.key not in set(removed_keys)]
    content.price_minor = (content.price_minor or 0) + price_change_minor
    return _write_and_redraft(parent, listing, content, acting_account_id, except_child_task_id, db)


def write_parent_with(
    parent: Task,
    listing: PublicListingRecord,
    current: ScopeVersion,
    restored: Sequence[RequirementInput],
    price_change_minor: int,
    acting_account_id: str,
    except_child_task_id: str,
    db: Session,
) -> ScopeVersion:
    """Write the parent's next version with restored requirements appended and its price changed."""

    content = content_of_version(current, db)
    present = {item.key for item in content.requirements}
    content.requirements = [*content.requirements, *(item for item in restored if item.key not in present)]
    content.price_minor = (content.price_minor or 0) + price_change_minor
    return _write_and_redraft(parent, listing, content, acting_account_id, except_child_task_id, db)


def latest_rows_for_keys(parent: Task, keys: Sequence[str], db: Session) -> list[RequirementInput]:
    """Return the most recent stored row for each key on any of the parent's scope versions, in the given key order."""

    rows = db.scalars(
        select(Requirement)
        .join(ScopeVersion, ScopeVersion.id == Requirement.scope_version_id)
        .where(ScopeVersion.task_id == parent.id, Requirement.requirement_key.in_(list(keys)))
        .order_by(ScopeVersion.version_number.desc())
    ).all()
    latest: dict[str, Requirement] = {}
    for row in rows:
        latest.setdefault(row.requirement_key, row)
    return [requirement_to_input(latest[key]) for key in keys if key in latest]


def _write_and_redraft(
    parent: Task,
    listing: PublicListingRecord,
    content: ScopeVersionContent,
    acting_account_id: str,
    except_child_task_id: str,
    db: Session,
) -> ScopeVersion:
    scope = write_task_scope_version(parent, content, db)
    if parent.expense_id is not None:
        expense = db.get(ServiceExpense, parent.expense_id)
        if expense is None:
            raise LookupError(f"Rebid task {parent.id} lost its expense")
        # The expense flow's own draft step: new scope version, scope confirmed, audited, same preview/publish after.
        create_listing_draft(
            expense,
            scope,
            PublishChoices(
                bidding_mode=listing.bidding_mode,
                show_incumbent_vendor=listing.show_incumbent_vendor,
                show_exact_address=listing.show_exact_address,
            ),
            db,
        )
    else:
        previous_state = listing.visibility
        listing.scope_version_id = scope.id
        if listing.visibility == ListingVisibility.public.value:
            listing.visibility = ListingVisibility.scope_confirmed.value
        projection = build_task_projection(listing, parent, scope, db)
        persist_projection(listing, projection)
        sync_task_state(parent, listing.visibility)
        write_visibility_audit(None, acting_account_id, previous_state, listing.visibility, projection.model_dump_json(), db, parent.id)
    flag_pieces_after_parent_change(parent, db, except_child_task_id=except_child_task_id)
    return scope
