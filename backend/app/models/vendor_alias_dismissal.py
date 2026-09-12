"""Records an owner's decision that two vendor groups are not the same vendor.
Dismissals stop a suggestion from reappearing; they never merge or rename anything.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VendorAliasDismissal(Base):
    """One dismissed alias pair, keyed by vendor group names rather than expense IDs.

    Group names survive re-syncs, while expense rows can be recreated, so keying on
    names keeps a dismissal in force across imports.
    """

    __tablename__ = "vendor_alias_dismissals"
    __table_args__ = (
        UniqueConstraint(
            "owner_account_id",
            "alias_vendor",
            "canonical_vendor",
            name="uq_vendor_alias_dismissal_pair",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)
    alias_vendor: Mapped[str] = mapped_column(String(255), nullable=False)
    canonical_vendor: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
