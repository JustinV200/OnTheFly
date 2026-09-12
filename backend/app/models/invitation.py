"""Stores outbound invitation metadata for the future secondary-path workflow.
Secondary path — seeding marketplace supply. Not part of the demo critical path.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Invitation(Base):
    """Represents a not-yet-implemented outbound invitation record."""

    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("public_listings.id"), nullable=False, index=True)
    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    message_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_state: Mapped[str] = mapped_column(String(64), nullable=False, default="not_implemented")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
