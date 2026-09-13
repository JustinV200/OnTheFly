"""Creates the private listing record of a new task or piece, so its task always resolves to exactly one listing.
The record is private and serves nothing until the poster confirms, previews and publishes it.
"""

import uuid

from sqlalchemy.orm import Session

from app.core.visibility import ListingVisibility
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.tasks import Task
from app.services.listings.projection import persist_projection
from app.services.tasks.listing.publish import build_task_projection


def create_private_task_listing(task: Task, scope: ScopeVersion, db: Session) -> PublicListingRecord:
    """Insert the task's private listing on its first scope version, sealed and with its price hidden by default."""

    listing = PublicListingRecord(
        id=str(uuid.uuid4()),
        expense_id=None,
        task_id=task.id,
        scope_version_id=scope.id,
        owner_account_id=task.posted_by_account_id,
        visibility=ListingVisibility.private.value,
        bidding_mode="sealed",
        show_price=False,
        show_incumbent_vendor=False,
        show_exact_address=False,
    )
    persist_projection(listing, build_task_projection(listing, task, scope, db))
    db.add(listing)
    db.flush()
    return listing
