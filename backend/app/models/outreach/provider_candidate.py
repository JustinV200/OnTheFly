"""Stores a provider an owner might invite to challenge one public listing.
A durable review record (roadmap 08, step 4): discovered or manually added, never an invitation by itself.
"""

from datetime import datetime, timezone
import secrets
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _new_opt_out_token() -> str:
    # The token is the only credential on the public opt-out link, so it must be unguessable.
    return secrets.token_urlsafe(32)


class ProviderCandidate(Base):
    """Represents one provider found for a listing, with where every detail came from."""

    __tablename__ = "provider_candidates"
    # The same provider found twice (or found and also added by hand) stays one row per listing.
    __table_args__ = (UniqueConstraint("listing_id", "dedupe_key", name="uq_provider_candidate_listing_dedupe"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("public_listings.id"), nullable=False, index=True)
    owner_account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    website_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # Stored lowercased so suppression and attribution compare exact normalized strings.
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email_source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    service_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    capability_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ProviderCandidateOrigin: discovered | manually_added.
    origin: Mapped[str] = mapped_column(String(32), nullable=False)
    # The discovery source name (fixture | tavily | usaspending_tavily), or "owner" for a manual addition.
    discovery_source: Mapped[str] = mapped_column(String(32), nullable=False)
    # ProviderCandidateProvenance: demo_data | public_web | public_award | owner_entered.
    provenance: Mapped[str] = mapped_column(String(32), nullable=False)
    # USAspending's recipient UEI, the candidate's identity when present. Null for fixture, web and manual candidates.
    supplier_uei: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    # JSON array of the pages this provider's details were read from.
    source_urls: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    # JSON array of evidence records (services/discovery/evidence): awards and web pages, each with its own source.
    evidence: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    # Null only for a manual addition, which was never retrieved from a source.
    retrieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dedupe_key: Mapped[str] = mapped_column(String(255), nullable=False)
    # Roadmap 08, "Watch out for": a provider already contacted by hand is never invited automatically.
    contacted_off_platform: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    opt_out_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, default=_new_opt_out_token)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
