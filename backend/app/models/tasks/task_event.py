"""Audits task-level decisions: acceptance and ownership transfer, splits and undos, and constraint removals.
Listing visibility changes keep their own audit (VisibilityAudit); this table records who changed responsibility.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TaskEvent(Base):
    """One audited event on a task, with the acting account and a JSON detail payload."""

    __tablename__ = "task_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    # accepted | ownership_transferred | created | split_off | split_undone | constraint_removed | ...
    kind: Mapped[str] = mapped_column(String(48), nullable=False)
    # JSON object; for ownership_transferred it names the prior and new owner account ids.
    detail_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
