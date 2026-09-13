"""The money view of a task its viewer owns through an accepted offer (plan2, "Money views", task owner).
Starting price is the accepted offer; pieces are the owner's own; keep cost uses the owner's internal rates only.
"""

from sqlalchemy.orm import Session

from app.models.tasks import Task
from app.services.rates import find_rate
from app.services.splitting.ledger import build_ledger
from app.services.splitting.requirements_in_play import requirements_still_with_task
from app.services.tasks.money.pieces import client_of, piece_lines
from app.services.tasks.money.types import OwnerMoneyView


def owner_money_view(task: Task, account_id: str, db: Session) -> OwnerMoneyView | None:
    """Return the view for the task's current owner after acceptance; None for anyone else or before acceptance."""

    if task.accepted_challenge_id is None or task.owner_account_id != account_id:
        return None
    ledger = build_ledger(task, db)
    if ledger.starting_price_minor is None or ledger.remainder_minor is None:
        raise LookupError(f"Accepted task {task.id} has no starting price")

    keep_cost, gaps = _keep_cost(task, account_id, db)
    return OwnerMoneyView(
        task_id=task.id,
        currency=task.currency,
        billing_period=task.billing_period,
        client=client_of(task, db),
        starting_price_minor=ledger.starting_price_minor,
        pieces=piece_lines(ledger.pieces, db),
        total_cuts_minor=ledger.total_cuts_minor,
        committed_minor=ledger.committed_minor,
        remainder_minor=ledger.remainder_minor,
        keep_cost_minor=keep_cost,
        keep_cost_gaps=gaps,
        potential_margin_minor=ledger.remainder_minor - keep_cost if keep_cost is not None else None,
    )


def _keep_cost(task: Task, account_id: str, db: Session) -> tuple[int | None, list[str]]:
    # Hours × rate for every requirement still with the task. One gap makes the total unknown, not partial.
    total = 0
    gaps: list[str] = []
    for requirement in requirements_still_with_task(task, db):
        if requirement.hours_estimate is None:
            gaps.append(f"Hours unanswered: {requirement.text}")
            continue
        if not requirement.labor_category:
            gaps.append(f"No labor category: {requirement.text}")
            continue
        rate = find_rate(task, account_id, requirement.labor_category, task.currency, db)
        if rate is None:
            gaps.append(f"No rate for {requirement.labor_category}")
            continue
        total += requirement.hours_estimate * rate.rate_minor_per_hour
    return (None, sorted(set(gaps))) if gaps else (total, [])
