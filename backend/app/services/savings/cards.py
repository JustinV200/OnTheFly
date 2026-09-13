"""Computes, stores and updates a task owner's Ways to save cards (roadmap 12, step 9).
Only the current task owner sees or computes cards, always with its own rates. A new scope version or new rates make
cards stale; a dismissal holds for the scope version it was made on.
"""

import json

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.savings import SavingsCard
from app.models.tasks import Task
from app.services.market_data import build_market_data_source
from app.services.scope.requirements import load_constraints
from app.services.splitting.ledger import build_ledger
from app.services.splitting.requirements_in_play import requirements_still_with_task, splittable_scope_version
from app.services.savings.costs import compute_costs
from app.services.savings.gather import gather_inputs
from app.services.savings.inputs import CardInputs
from app.services.savings.segments import build_segments
from app.services.savings.thresholds import SavingsThresholds, current_thresholds
from app.services.savings.viability import classify
from app.services.tasks.access import require_task_owner

# Cards in these states describe the current scope version and rates; "stale" ones are history.
_LIVE_STATUSES = ("suggested", "dismissed", "split")


def current_cards(task: Task, account_id: str, db: Session) -> list[SavingsCard]:
    """Return the owner's live cards for the task's current scope, computing them first if any segment still with the
    task has no open card."""

    require_task_owner(task, account_id, "see Ways to save")
    scope = splittable_scope_version(task, db)
    if scope is None:
        return []
    cards = _live_cards(task.id, account_id, scope.id, db)
    # A split card is live but closed. A split marks every other card stale, so "any live card" alone would leave the
    # remaining segments uncomputed and the panel claiming every requirement went to a piece.
    open_segment_keys = {card.segment_key for card in cards if card.status in ("suggested", "dismissed")}
    remaining_segment_keys = {segment.key for segment in build_segments(requirements_still_with_task(task, db)).segments}
    if cards and remaining_segment_keys <= open_segment_keys:
        return cards
    return refresh_cards(task, account_id, db)


def refresh_cards(task: Task, account_id: str, db: Session) -> list[SavingsCard]:
    """Query the market-data source again and replace the owner's suggested and dismissed cards with fresh ones."""

    require_task_owner(task, account_id, "refresh Ways to save")
    scope = splittable_scope_version(task, db)
    if scope is None:
        return []
    previous = db.scalars(
        select(SavingsCard).where(SavingsCard.task_id == task.id, SavingsCard.account_id == account_id).order_by(SavingsCard.computed_at)
    ).all()
    # Latest card per segment wins: oversight carries over always, a dismissal only on the same scope version.
    # Copied out before the bulk update below, which also rewrites the loaded objects' status in the session.
    previous_by_segment = {
        card.segment_key: (card.oversight_minor, card.status == "dismissed" and card.scope_version_id == scope.id)
        for card in previous
    }
    db.execute(
        update(SavingsCard)
        .where(SavingsCard.task_id == task.id, SavingsCard.account_id == account_id, SavingsCard.status.in_(["suggested", "dismissed"]))
        .values(status="stale")
    )

    thresholds = current_thresholds()
    ledger = build_ledger(task, db)
    constraint_kinds = sorted({row.kind for row in load_constraints(scope.id, db)})
    source = build_market_data_source()
    segmentation = build_segments(requirements_still_with_task(task, db))
    for segment in segmentation.segments:
        inputs, evidence_ids = gather_inputs(
            task, account_id, scope, segment, ledger.remainder_minor, constraint_kinds, source, thresholds, db
        )
        oversight, is_dismissed = previous_by_segment.get(segment.key, (None, False))
        card = SavingsCard(
            task_id=task.id,
            account_id=account_id,
            scope_version_id=scope.id,
            segment_key=segment.key,
            inputs_json=inputs.model_dump_json(),
            evidence_ids_json=json.dumps(evidence_ids),
            thresholds_json=thresholds.model_dump_json(),
            currency=task.currency,
            billing_period=task.billing_period,
            status="dismissed" if is_dismissed else "suggested",
        )
        apply_computation(card, inputs, oversight, thresholds)
        db.add(card)
    db.commit()
    return _live_cards(task.id, account_id, scope.id, db)


def apply_computation(card: SavingsCard, inputs: CardInputs, oversight_minor: int | None, thresholds: SavingsThresholds) -> None:
    """Write the costs and tier computed from inputs onto the card. The same inputs always give the same integers."""

    costs = compute_costs(inputs, oversight_minor, card.currency, card.billing_period)
    viability = classify(inputs, costs, thresholds)
    card.keep_cost_minor = costs.keep_cost_minor
    card.suggested_cut_minor = costs.suggested_cut_minor
    card.oversight_minor = oversight_minor
    card.modeled_savings_minor = costs.modeled_savings_minor
    card.modeled_savings_basis_points = costs.modeled_savings_basis_points
    card.tier = viability.tier
    card.reasons_json = json.dumps(viability.reasons)


def owned_card(card_id: str, account_id: str, db: Session) -> tuple[SavingsCard, Task]:
    """Return a card the account computed on a task it still owns; anything else is not found."""

    card = db.get(SavingsCard, card_id)
    task = db.get(Task, card.task_id) if card is not None else None
    if card is None or task is None or card.account_id != account_id or task.owner_account_id != account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ways to save card not found")
    return card, task


def set_card_status(card_id: str, account_id: str, new_status: str, db: Session) -> SavingsCard:
    """Dismiss a suggested card, or restore a dismissed one; split and stale cards can't change here."""

    card, _ = owned_card(card_id, account_id, db)
    allowed = {"dismissed": "suggested", "suggested": "dismissed"}
    if allowed.get(new_status) != card.status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"A {card.status} card can't become {new_status}")
    card.status = new_status
    db.commit()
    db.refresh(card)
    return card


def set_card_oversight(card_id: str, account_id: str, oversight_minor: int | None, db: Session) -> SavingsCard:
    """Set or clear the owner's oversight cost and recompute the card from its stored inputs; no source is queried."""

    card, _ = owned_card(card_id, account_id, db)
    if card.status in ("stale", "split"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"This card is {card.status}")
    if oversight_minor is not None and oversight_minor < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Oversight cost can't be negative")
    inputs = CardInputs.model_validate_json(card.inputs_json)
    thresholds = SavingsThresholds.model_validate_json(card.thresholds_json)
    apply_computation(card, inputs, oversight_minor, thresholds)
    db.commit()
    db.refresh(card)
    return card


def mark_task_cards_stale(task_id: str, db: Session, except_card_id: str | None = None) -> None:
    """Mark a task's suggested and dismissed cards stale, e.g. after a split changed which requirements remain."""

    query = update(SavingsCard).where(SavingsCard.task_id == task_id, SavingsCard.status.in_(["suggested", "dismissed"]))
    if except_card_id is not None:
        query = query.where(SavingsCard.id != except_card_id)
    db.execute(query.values(status="stale"))


def _live_cards(task_id: str, account_id: str, scope_version_id: str, db: Session) -> list[SavingsCard]:
    return list(
        db.scalars(
            select(SavingsCard)
            .where(
                SavingsCard.task_id == task_id,
                SavingsCard.account_id == account_id,
                SavingsCard.scope_version_id == scope_version_id,
                SavingsCard.status.in_(_LIVE_STATUSES),
            )
            .order_by(SavingsCard.modeled_savings_minor.desc().nulls_last(), SavingsCard.segment_key)
        ).all()
    )
