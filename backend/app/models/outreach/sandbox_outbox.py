"""Stores invitations the sandbox channel "sent", so the demo shows real output while no email leaves the machine.
The unique invitation id means the sandbox can never hold two copies of one invitation.
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SandboxOutboxMessage(Base):
    """Represents one rendered invitation captured by the sandbox channel instead of being emailed."""

    __tablename__ = "sandbox_outbox"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invitation_id: Mapped[str] = mapped_column(ForeignKey("invitations.id"), nullable=False, unique=True)
    to_email: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    headers_json: Mapped[str] = mapped_column(Text, nullable=False)
    stored_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
