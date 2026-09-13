"""Stores an offer's answer to each requirement of the scope version it answered (roadmap 12, step 2).
Rows with challenge_revision_id None belong to the offer's current version; a revision snapshot keeps its own rows.
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChallengeRequirementResponse(Base):
    """Whether one offer version includes one requirement, with an optional note."""

    __tablename__ = "challenge_requirement_responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"), nullable=False, index=True)
    # None for the current version; set to the snapshot's id when a revision replaces this version.
    challenge_revision_id: Mapped[str | None] = mapped_column(
        ForeignKey("challenge_revisions.id"), nullable=True, index=True
    )
    scope_version_id: Mapped[str] = mapped_column(ForeignKey("scope_versions.id"), nullable=False)
    requirement_key: Mapped[str] = mapped_column(String(64), nullable=False)
    is_included: Mapped[bool] = mapped_column(Boolean, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
