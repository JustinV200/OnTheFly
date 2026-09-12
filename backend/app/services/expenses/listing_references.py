"""Finds which expenses the listing flow has already referenced.
A referenced expense has scope versions, a listing record, or visibility audits pointing at it,
so it must never be deleted or merged away.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.visibility_audit import VisibilityAudit


def listed_expense_ids(expense_ids: list[str], db: Session) -> set[str]:
    """Return the subset of expense_ids that any listing-flow record references.

    Audits count even without a listing: the audit trail of a visibility change must
    keep resolving to the expense it describes.
    """

    if not expense_ids:
        return set()
    referenced: set[str] = set()
    for column in (ScopeVersion.expense_id, PublicListingRecord.expense_id, VisibilityAudit.expense_id):
        referenced.update(db.scalars(select(column).where(column.in_(expense_ids)).distinct()).all())
    return referenced
