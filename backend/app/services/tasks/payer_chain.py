"""Computes a task's payer chain: the accounts whose money funds the work (roadmap 12, step 6).
No account in the chain may bid on the task, so nobody can pay themselves for their own work.
"""

from sqlalchemy.orm import Session

from app.models.tasks import Task


def payer_chain(task: Task, db: Session) -> list[str]:
    """Return the chain's account ids, nearest payer first.

    The chain is the task's poster, plus the parent's chain when the poster owns the parent through an accepted
    offer. A bidder who later wins a buyer's parent task is not in the chain for pieces the buyer split off before:
    those pieces were posted by the buyer, who never owned the parent through an acceptance.
    """

    chain: list[str] = []
    current: Task | None = task
    # Each step moves to a parent, and depth strictly decreases, so the walk ends at a task with no parent.
    while current is not None:
        chain.append(current.posted_by_account_id)
        parent = db.get(Task, current.parent_task_id) if current.parent_task_id else None
        if parent is None:
            break
        owns_parent_by_acceptance = (
            parent.accepted_challenge_id is not None and parent.owner_account_id == current.posted_by_account_id
        )
        if not owns_parent_by_acceptance:
            break
        current = parent
    return list(dict.fromkeys(chain))
