"""Builds the task detail one participant sees: scope, pieces, ledger, money view and what it may do next.
The poster of an accepted task sees its own side only; the owner sees its client and its own pieces (roadmap 12, step 6).
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.task_lifecycle import TaskRelationship
from app.models.challenge import Challenge
from app.models.listing import ScopeVersion
from app.models.tasks import Task
from app.services.listings.current_price import resolve_stated_price
from app.services.scope.templates import template_for
from app.services.splitting.ledger import PieceCommitment, TaskLedger, build_ledger
from app.services.splitting.requirements_in_play import splittable_scope_version
from app.services.splitting.suggested_count import active_suggested_pieces
from app.services.tasks.access import get_participant_task, listing_for_task
from app.services.tasks.listing.subcontract import is_subcontract
from app.services.tasks.money import buyer_money_view, owner_money_view
from app.services.tasks.money.pieces import piece_lines, pre_acceptance_splits
from app.services.tasks.views.events_view import visible_events
from app.services.tasks.views.parent_ref import visible_parent
from app.services.tasks.views.requirements_view import constraint_rows, requirement_rows
from app.services.tasks.views.types import ListingSummary, TaskDetail


def build_task_detail(task_id: str, account_id: str, db: Session) -> TaskDetail:
    """Return the detail for the task's poster or owner; anyone else gets 404 from get_participant_task."""

    task, relationship = get_participant_task(task_id, account_id, db)
    is_owner = task.owner_account_id == account_id
    is_poster = task.posted_by_account_id == account_id
    scope = splittable_scope_version(task, db)
    ledger = build_ledger(task, db) if is_owner else None
    # The owner sees the pieces that count against its remainder; a client sees only pieces it split off itself.
    commitments = ledger.pieces if ledger is not None else _poster_piece_commitments(task, db)
    can_split, block_reason = _split_permission(relationship, ledger)
    return TaskDetail(
        id=task.id,
        origin=task.origin,
        state=task.state,
        title=task.title,
        category=task.category,
        currency=task.currency,
        billing_period=task.billing_period,
        depth=task.depth,
        created_at=task.created_at,
        relationship=relationship.value,
        is_posted_by_you=is_poster,
        is_owned_by_you=is_owner,
        is_subcontract=is_subcontract(task, db),
        parent_scope_changed_at=task.parent_scope_changed_at if is_poster else None,
        parent=visible_parent(task, account_id, db),
        expense_id=task.expense_id if is_poster else None,
        listing=_listing_summary(task, db) if is_poster else None,
        scope_version_number=scope.version_number if scope is not None else None,
        requirements=requirement_rows(task, scope, account_id, db) if scope is not None else [],
        constraints=constraint_rows(scope, db) if scope is not None else [],
        scope_fields=template_for(task.category).public_fields(scope.category_fields) if scope is not None else [],
        ledger=ledger,
        pieces=piece_lines(commitments, db),
        buyer_money=buyer_money_view(task, account_id, db),
        owner_money=owner_money_view(task, account_id, db),
        can_split=can_split,
        split_block_reason=block_reason,
        active_suggested_pieces=active_suggested_pieces(task.id, db),
        max_suggested_pieces=get_settings().max_suggested_pieces_per_task,
        events=visible_events(task, account_id, db),
    )


def _poster_piece_commitments(task: Task, db: Session) -> list[PieceCommitment]:
    commitments: list[PieceCommitment] = []
    for split in pre_acceptance_splits(task, db):
        child = db.get(Task, split.child_task_id)
        accepted = child.accepted_price_minor if child is not None and child.accepted_challenge_id else None
        commitments.append(
            PieceCommitment(
                split_id=split.id,
                child_task_id=split.child_task_id,
                cut_minor=split.cut_minor,
                accepted_price_minor=accepted,
                committed_minor=accepted if accepted is not None else split.cut_minor,
            )
        )
    return commitments


def _listing_summary(task: Task, db: Session) -> ListingSummary | None:
    listing = listing_for_task(task.id, db)
    scope = db.get(ScopeVersion, listing.scope_version_id) if listing is not None else None
    if listing is None or scope is None:
        return None
    stated = resolve_stated_price(scope)
    offer_count = db.scalar(
        select(func.count()).select_from(Challenge).where(Challenge.listing_id == listing.id, Challenge.is_active.is_(True))
    )
    return ListingSummary(
        id=listing.id,
        visibility=listing.visibility,
        bidding_mode=listing.bidding_mode,
        price_disclosed=bool(listing.show_price),
        stated_price_minor=stated.amount.amount if stated is not None else None,
        offer_count=int(offer_count or 0),
        published_at=listing.published_at,
        challenge_deadline=scope.challenge_deadline,
        scope_version_number=scope.version_number,
    )


def _split_permission(relationship: TaskRelationship, ledger: TaskLedger | None) -> tuple[bool, str | None]:
    # Mirrors the checks split_off_piece enforces, so the screen explains a refusal before the owner tries.
    if relationship == TaskRelationship.poster:
        return False, "You accepted an offer on this task, so the bidder owns it now. Only the current task owner can split it."
    if ledger is None or ledger.starting_price_minor is None:
        return False, "Set a budget before splitting: a piece's cut comes out of the task's starting price."
    # No check for requirements left with the task: the owner can add a piece's own requirements in the split drawer,
    # so a task with no rows (such as a listing backfilled by migration 0013) or with every row in a piece can still split.
    if ledger.remainder_minor is not None and ledger.remainder_minor <= 0:
        return False, "Your remainder is zero, so there is nothing left to cut."
    return True, None

