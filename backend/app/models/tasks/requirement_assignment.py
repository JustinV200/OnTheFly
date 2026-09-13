"""Records which requirement keys a split assigned to its piece.
A requirement is covered by the task or by exactly one active piece; the split's undone_at decides "active".
"""

import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RequirementAssignment(Base):
    """One requirement key moved from a parent task to a piece by one split."""

    __tablename__ = "requirement_assignments"
    __table_args__ = (UniqueConstraint("split_id", "requirement_key", name="uq_requirement_assignment_split_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    split_id: Mapped[str] = mapped_column(ForeignKey("task_splits.id"), nullable=False, index=True)
    # The parent's key for the requirement.
    requirement_key: Mapped[str] = mapped_column(String(64), nullable=False)
    # The piece's own fresh key for its copy. Kept apart so a public key never links a piece to its parent.
    child_requirement_key: Mapped[str] = mapped_column(String(64), nullable=False)
