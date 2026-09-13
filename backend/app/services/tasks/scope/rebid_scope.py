"""Confirms a REBID's scope as requirement rows, constraints and template fields, then drafts its listing.
It reuses the expense publish flow (create_listing_draft), so a rebid still previews and publishes the same way.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task
from app.services.expenses.corrections import ExpenseCorrectionError, OwnerExpenseUpdate, apply_owner_expense_update
from app.services.listings.create import create_listing_draft
from app.services.listings.types import PublishChoices
from app.services.tasks.rebid_task import ensure_rebid_task
from app.services.tasks.scope.parent_scope_flags import flag_pieces_after_parent_change
from app.services.tasks.scope.types import TaskScopeDraft
from app.services.tasks.scope.write_version import ScopeVersionContent, validate_category_fields, write_task_scope_version


def confirm_rebid_scope(
    expense: ServiceExpense,
    draft: TaskScopeDraft,
    choices: PublishChoices,
    db: Session,
) -> tuple[PublicListingRecord, ScopeVersion, Task]:
    """Write the rebid's next scope version from the owner's draft and return the scope-confirmed listing.

    Assumes the caller checked the expense belongs to the acting account. The confirmed price must be stated:
    a rebid's starting price is the observed spend the owner confirmed, in the period they confirmed it in.
    """

    if draft.price_minor is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirm the current price you pay; a rebid's starting price is your observed spend.",
        )
    category_fields_json = validate_category_fields(draft.category, draft.category_fields)
    if (expense.owner_corrected_category or expense.category) != draft.category:
        # Recorded as the owner's category correction, which persists across imports (CLAUDE.md, AI boundaries).
        try:
            apply_owner_expense_update(expense, OwnerExpenseUpdate(owner_corrected_category=draft.category), db)
        except ExpenseCorrectionError as error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if not expense.is_publishable:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense is not publishable")

    existing = db.scalar(select(PublicListingRecord).where(PublicListingRecord.expense_id == expense.id))
    task = ensure_rebid_task(expense, existing, draft.currency, draft.billing_period, db)
    if task.accepted_challenge_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This task already accepted an offer; its accepted scope can't be replaced.",
        )
    task.title = draft.title
    task.category = draft.category
    scope = write_task_scope_version(
        task,
        ScopeVersionContent(
            requirements=draft.requirements,
            constraints=draft.constraints,
            price_minor=draft.price_minor,
            category_fields_json=category_fields_json,
            service_area=draft.service_area,
            challenge_deadline=draft.challenge_deadline,
            incumbent_vendor_name=draft.incumbent_vendor_name,
        ),
        db,
    )
    listing = create_listing_draft(expense, scope, choices, db)
    flag_pieces_after_parent_change(task, db)
    db.commit()
    db.refresh(listing)
    return listing, scope, task
