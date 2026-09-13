"""Stores one approved outbound invitation and its delivery state.
The (listing, candidate) unique constraint is the idempotency key: one invitation per provider per listing, ever.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.invitation_state import InvitationState
from app.db.base import Base


class Invitation(Base):
    """Represents the exact message an owner approved for one provider, and what happened to it."""

    __tablename__ = "invitations"
    # Roadmap 08, step 7: requeues, retries, restarts, and double-clicks must all be no-ops, so the
    # database refuses a second row for the same provider on the same listing.
    __table_args__ = (
        UniqueConstraint("listing_id", "provider_candidate_id", name="uq_invitation_listing_candidate"),
        # The same inbox, whichever candidate record it came from, gets at most one invitation per listing.
        UniqueConstraint("listing_id", "recipient_email", name="uq_invitation_listing_recipient"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("public_listings.id"), nullable=False, index=True)
    provider_candidate_id: Mapped[str] = mapped_column(ForeignKey("provider_candidates.id"), nullable=False)
    approval_id: Mapped[str] = mapped_column(ForeignKey("invitation_approvals.id"), nullable=False)
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    # Subject, body, and headers are stored exactly as approved; the sender never re-renders them.
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    headers_json: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    state: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=InvitationState.queued.value,
        index=True,
    )
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
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
