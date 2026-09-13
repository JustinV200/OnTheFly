"""Stores one requirement row on a scope version (roadmap 12, step 2).
Rows are copied, never edited, when a new version is written, so an offer's answered version keeps its own rows.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Requirement(Base):
    """One requirement on one scope version, with its labor tags and hours."""

    __tablename__ = "requirements"
    __table_args__ = (UniqueConstraint("scope_version_id", "requirement_key", name="uq_requirement_version_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scope_version_id: Mapped[str] = mapped_column(ForeignKey("scope_versions.id"), nullable=False, index=True)
    # Stable across versions and across a split: the piece's copy keeps the parent's key.
    requirement_key: Mapped[str] = mapped_column(String(64), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # must | should
    priority: Mapped[str] = mapped_column(String(8), nullable=False, default="must")
    labor_category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    psc: Mapped[str | None] = mapped_column(String(8), nullable=True)
    naics: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # draft | confirmed. Only confirmed tags form Ways to save segments.
    tags_status: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    # Hours per the task's billing period; None is explicitly unanswered, which is different from zero.
    hours_estimate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # draft | confirmed | unanswered
    hours_status: Mapped[str] = mapped_column(String(16), nullable=False, default="unanswered")
    # owner | llm-draft | flowed-down
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="owner")
