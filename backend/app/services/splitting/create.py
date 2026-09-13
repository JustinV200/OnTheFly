"""Splits a piece off a task: the owner picks requirements and a cut, and the piece becomes its own private task.
Only the current task owner can split. Splitting never publishes; the piece goes through confirm, preview and publish.
"""

from typing import Literal

from fastapi import HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.task_lifecycle import SplitEntryPoint, TaskOrigin, TaskState
from app.models.savings import SavingsCard
from app.models.scope import Requirement
from app.models.tasks import RequirementAssignment, Task, TaskSplit
from app.services.savings.cards import mark_task_cards_stale
from app.services.scope.requirements import RequirementInput, load_constraints, new_requirement_key, requirement_to_input
from app.services.splitting.flow_down import ConstraintRef, UnacknowledgedRemovalError, flow_down_constraints
from app.services.splitting.ledger import CutProblem, build_ledger, check_new_cut
from app.services.splitting.parent_rewrite import write_parent_without
from app.services.splitting.requirements_in_play import requirements_still_with_task, splittable_scope_version
from app.services.splitting.suggested_count import active_suggested_pieces
from app.services.tasks.access import listing_for_task, require_task_owner
from app.services.tasks.events import write_task_event
from app.services.tasks.scope.private_listing import create_private_task_listing
from app.services.tasks.scope.write_version import ScopeVersionContent, write_task_scope_version


class SplitRequest(BaseModel):
    """What the owner chose in the split drawer."""

    title: str = Field(min_length=1, max_length=255)
    requirement_keys: list[str] = Field(min_length=1)
    cut_minor: int = Field(gt=0)
    # Sent explicitly so a cut typed in another currency or period is refused, never silently reinterpreted.
    currency: str
    billing_period: str
    entry_point: Literal["suggested", "manual"] = "manual"
    savings_card_id: str | None = None
    removed_constraints: list[ConstraintRef] = Field(default_factory=list)
    is_constraint_removal_acknowledged: bool = False


def split_off_piece(parent_task_id: str, acting_account_id: str, request: SplitRequest, db: Session) -> TaskSplit:
    """Create the piece and its split record, and return the split.

    Raises 404 for anyone but the parent's poster or owner, 403 for a poster whose task was accepted, and 400 for
    a broken rule: an unknown or already assigned requirement, a cut outside the ledger, the suggestion cap, or an
    unacknowledged constraint removal. Nothing is written unless every check passes.
    """

    parent = db.get(Task, parent_task_id)
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    require_task_owner(parent, acting_account_id, "split this task")
    is_before_acceptance = parent.accepted_challenge_id is None
    listing = listing_for_task(parent.id, db)
    scope = splittable_scope_version(parent, db)
    if listing is None or scope is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Confirm this task's scope before splitting it")

    chosen = _chosen_requirements(parent, request.requirement_keys, db)
    card = _card_for(request, parent, acting_account_id, db)
    _check_cut(parent, request, is_before_acceptance, db)
    try:
        flow = flow_down_constraints(
            parent.id, load_constraints(scope.id, db), request.removed_constraints, request.is_constraint_removal_acknowledged
        )
    except UnacknowledgedRemovalError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    child = Task(
        origin=TaskOrigin.split.value,
        parent_task_id=parent.id,
        posted_by_account_id=acting_account_id,
        owner_account_id=acting_account_id,
        depth=parent.depth + 1,
        state=TaskState.private.value,
        title=request.title,
        category=parent.category,
        currency=parent.currency,
        billing_period=parent.billing_period,
    )
    db.add(child)
    db.flush()
    # Fresh keys for the piece's copies: a public key must never link the piece's listing to the parent's.
    key_pairs = [(row.requirement_key, new_requirement_key()) for row in chosen]
    child_requirements: list[RequirementInput] = []
    for row, (_, child_key) in zip(chosen, key_pairs, strict=True):
        copied = requirement_to_input(row)
        copied.key = child_key
        copied.source = "flowed-down"
        child_requirements.append(copied)
    child_scope = write_task_scope_version(
        child,
        ScopeVersionContent(
            requirements=child_requirements,
            constraints=flow.inherited,
            price_minor=request.cut_minor,
            # Template fields such as a mission summary can describe the client, so they stay with the parent.
            category_fields_json=None,
            service_area=scope.service_area or scope.location_approximate,
            challenge_deadline=None,
        ),
        db,
    )
    split = TaskSplit(
        parent_task_id=parent.id,
        child_task_id=child.id,
        split_by_account_id=acting_account_id,
        split_before_acceptance=is_before_acceptance,
        entry_point=request.entry_point,
        cut_minor=request.cut_minor,
        # check_new_cut already required these to equal the parent's, so the parent's spelling is stored.
        currency=parent.currency,
        billing_period=parent.billing_period,
        savings_card_id=card.id if card is not None else None,
    )
    db.add(split)
    db.flush()
    db.add_all(
        RequirementAssignment(split_id=split.id, requirement_key=parent_key, child_requirement_key=child_key)
        for parent_key, child_key in key_pairs
    )
    create_private_task_listing(child, child_scope, db)

    if is_before_acceptance:
        # A buyer's split lowers its own listing: the requirements and the cut leave the parent's next version.
        new_parent_scope = write_parent_without(
            parent, listing, scope, [key for key, _ in key_pairs], -request.cut_minor, acting_account_id, child.id, db
        )
        split.parent_scope_version_id = new_parent_scope.id
    # The task's remaining requirements changed, so every other card is priced on an outdated segment.
    mark_task_cards_stale(parent.id, db, except_card_id=card.id if card is not None else None)
    if card is not None:
        card.status = "split"

    _audit(parent, child, split, flow.removed, [key for key, _ in key_pairs], acting_account_id, db)
    db.commit()
    db.refresh(split)
    return split


def _chosen_requirements(parent: Task, keys: list[str], db: Session) -> list[Requirement]:
    if len(set(keys)) != len(keys):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A requirement can only be picked once")
    available = {row.requirement_key: row for row in requirements_still_with_task(parent, db)}
    missing = [key for key in keys if key not in available]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{len(missing)} picked requirement(s) aren't with this task any more: each one stays with the task or "
                "goes to exactly one active piece."
            ),
        )
    if len(keys) == len(available) and parent.accepted_challenge_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave at least one requirement on your own listing, or unpublish it instead of splitting all of it.",
        )
    return [available[key] for key in keys]


def _check_cut(parent: Task, request: SplitRequest, is_before_acceptance: bool, db: Session) -> None:
    ledger = build_ledger(parent, db)
    try:
        check_new_cut(ledger, request.cut_minor, request.currency.strip().upper(), request.billing_period.strip().casefold())
    except CutProblem as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if is_before_acceptance and ledger.starting_price_minor is not None:
        listed_after = ledger.starting_price_minor - ledger.total_cuts_minor - request.cut_minor
        if listed_after <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your listing must keep a positive price after the split. Choose a smaller cut.",
            )
    if request.entry_point == SplitEntryPoint.suggested.value:
        cap = get_settings().max_suggested_pieces_per_task
        if active_suggested_pieces(parent.id, db) >= cap:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This task already has {cap} suggested pieces, the most allowed. You can still split off pieces manually.",
            )


def _card_for(request: SplitRequest, parent: Task, acting_account_id: str, db: Session) -> SavingsCard | None:
    if request.savings_card_id is None:
        if request.entry_point == SplitEntryPoint.suggested.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A suggested split names its Ways to save card")
        return None
    card = db.get(SavingsCard, request.savings_card_id)
    if card is None or card.task_id != parent.id or card.account_id != acting_account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ways to save card not found")
    if card.status != "suggested":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"This card is {card.status}; refresh Ways to save")
    if request.entry_point == SplitEntryPoint.suggested.value and card.tier != "potential_savings":
        # Only cards that meet every threshold are suggestions; any other card can still inform a manual split.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This segment isn't a suggestion (it doesn't meet every threshold). Split it off manually instead.",
        )
    return card


def _audit(
    parent: Task,
    child: Task,
    split: TaskSplit,
    removed: list[ConstraintRef],
    parent_keys: list[str],
    acting_account_id: str,
    db: Session,
) -> None:
    write_task_event(
        parent.id,
        acting_account_id,
        "split_off",
        {
            "split_id": split.id,
            "child_task_id": child.id,
            "cut_minor": split.cut_minor,
            "entry_point": split.entry_point,
            "split_before_acceptance": split.split_before_acceptance,
            "requirement_keys": parent_keys,
        },
        db,
    )
    write_task_event(child.id, acting_account_id, "created", {"origin": TaskOrigin.split.value}, db)
    for ref in removed:
        write_task_event(
            child.id,
            acting_account_id,
            "constraint_removed",
            {"kind": ref.kind, "value": ref.value, "warning": "Bidders on this piece are no longer told to meet it"},
            db,
        )
