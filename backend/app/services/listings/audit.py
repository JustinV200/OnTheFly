"""Stages the visibility audit row for every change to what a listing discloses.
It only adds the row to the session; the calling service owns the flush or commit.
"""

from sqlalchemy.orm import Session

from app.models.visibility_audit import VisibilityAudit


def write_visibility_audit(
    expense_id: str,
    account_id: str,
    previous_state: str,
    new_state: str,
    snapshot: str | None,
    db: Session,
) -> None:
    """Record who changed a listing's disclosure, what changed, and the public payload after it.

    Publication transitions store listing visibility values in previous_state/new_state.
    Bidding-mode toggles store "bidding_mode:<mode>" so they read apart from publish rows.
    The snapshot is the serialized public projection at that moment; changed_at is stamped
    by the model default.
    """

    db.add(
        VisibilityAudit(
            expense_id=expense_id,
            account_id=account_id,
            previous_state=previous_state,
            new_state=new_state,
            public_payload_snapshot=snapshot,
        )
    )
