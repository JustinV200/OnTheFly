"""Stores a constraint (clearance, location, insurance, set-aside) on a scope version.
Constraints flow down into a piece by default; inherited_from_task_id records that origin privately.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ScopeConstraint(Base):
    """One constraint on one scope version."""

    __tablename__ = "scope_constraints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scope_version_id: Mapped[str] = mapped_column(ForeignKey("scope_versions.id"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # clearance | location | insurance | set_aside
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    # The parent task this constraint flowed down from. Private: the piece's public projection never includes it.
    inherited_from_task_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
