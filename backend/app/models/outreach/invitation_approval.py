"""Records the owner's explicit approval of an invitation batch: who, what exactly, and when.
Roadmap 08, step 5: nothing sends without one of these rows.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InvitationApproval(Base):
    """Represents one approval click and the exact rendered batch it approved."""

    __tablename__ = "invitation_approvals"
    # A hash covers the exact recipients and messages, whose invitations then exist, so the same
    # hash can never be approved twice; a repeat (a double-click) replays this approval instead.
    __table_args__ = (UniqueConstraint("listing_id", "message_hash", name="uq_invitation_approval_listing_hash"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("public_listings.id"), nullable=False, index=True)
    approved_by_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    approved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    template_version: Mapped[str] = mapped_column(String(32), nullable=False)
    message_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    # JSON array of {candidate_id, name, email}: the recipient list exactly as approved.
    recipients: Mapped[str] = mapped_column(Text, nullable=False)
    listing_url: Mapped[str] = mapped_column(String(1024), nullable=False)
