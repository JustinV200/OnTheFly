"""Stores owner-specific vendor and category corrections for future imports.
Corrections are explicit overrides, not inferred renames across all accounts.
"""

from enum import StrEnum

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CorrectionMatchMode(StrEnum):
    """How a correction rule's pattern is compared with a transaction's raw description.

    word: the pattern appears as whole words anywhere in the description (owner renames).
    exact: the whole description equals the pattern, ignoring case (alias merges, which
    must never claim a longer descriptor such as "SPARKLE WINDOWS" for "SPARKLE").
    """

    word = "word"
    exact = "exact"


class VendorCorrection(Base):
    """Represents one owner-defined correction rule for vendor grouping."""

    __tablename__ = "vendor_corrections"
    __table_args__ = (
        UniqueConstraint(
            "owner_account_id",
            "raw_description_pattern",
            name="uq_vendor_correction_owner_pattern",
        ),
    )

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    raw_description_pattern: Mapped[str] = mapped_column(String(255), nullable=False)
    corrected_vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    corrected_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Rules stored before match modes existed were all owner renames, so the server default is "word".
    match_mode: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=CorrectionMatchMode.word.value,
        server_default=CorrectionMatchMode.word.value,
    )
