"""Stores tasks: the unit a listing projects publicly, with its poster and its current task owner (roadmap 12, step 1).
Money on a task is integer minor units in the task's one currency and billing period; nothing here converts either.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.task_lifecycle import TaskState
from app.db.base import Base


class Task(Base):
    """One piece of work: a rebid of observed spend, new work, or a piece split off another task."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # rebid | new | split (app.core.task_lifecycle.TaskOrigin).
    origin: Mapped[str] = mapped_column(String(16), nullable=False)
    # Only a rebid has an expense behind it.
    expense_id: Mapped[str | None] = mapped_column(ForeignKey("service_expenses.id"), nullable=True, index=True)
    # Only a split piece has a parent. Nothing about the parent is ever copied into the piece's public projection.
    parent_task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), nullable=True, index=True)
    # The POSTER: the account that posted the task and is its client. Never changes.
    posted_by_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    # The TASK OWNER: the account currently responsible for the work, and the only one that may split it.
    # Equals the poster until an offer is accepted, then becomes that offer's bidder.
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    # 0 for a task posted directly; a piece is its parent's depth + 1. Informational: depth is not capped.
    depth: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    state: Mapped[str] = mapped_column(String(32), nullable=False, default=TaskState.private.value)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    # Plain ids rather than foreign keys: challenges reference listings, which reference tasks, and a key back to
    # challenges would make the schema cyclic. services/tasks/acceptance.py is the only writer of all three.
    accepted_challenge_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    accepted_scope_version_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # The accepted offer's price restated in this task's billing period, snapshotted at acceptance so the new
    # owner's starting price never moves (a setup fee is one-time and not part of it).
    accepted_price_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # The poster's starting price just before acceptance (listed price plus the poster's own active cuts),
    # snapshotted so the poster's baseline never moves once the task has transferred.
    listed_starting_price_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    billing_period: Mapped[str] = mapped_column(String(32), nullable=False)
    # Set when the parent task gets a new scope version after this piece was split off: "parent scope changed,
    # review". The piece is never rewritten; the owner clears the flag once reviewed.
    parent_scope_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
