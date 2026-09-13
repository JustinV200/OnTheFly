"""Stores each piece split off a task: who split it, the cut it took, and whether it has been undone (roadmap 12, step 5).
The cut is integer minor units in the parent task's currency and billing period; P0 never converts periods.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TaskSplit(Base):
    """One piece split off a parent task. Active while undone_at is None."""

    __tablename__ = "task_splits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    child_task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, unique=True)
    split_by_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    # True for a buyer's split before it accepted an offer on the parent. Such pieces stay with the buyer when the
    # parent transfers, and never count against the new owner's remainder.
    split_before_acceptance: Mapped[bool] = mapped_column(Boolean, nullable=False)
    # suggested | manual | split_everything (app.core.task_lifecycle.SplitEntryPoint).
    entry_point: Mapped[str] = mapped_column(String(32), nullable=False)
    cut_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    billing_period: Mapped[str] = mapped_column(String(32), nullable=False)
    savings_card_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # For a buyer's split: the parent scope version the split wrote (without the assigned requirements, at the
    # reduced price), so undo can restore from the version before it.
    parent_scope_version_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    undone_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
