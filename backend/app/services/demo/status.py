"""Reports the demo's seams: where the financial data came from, whether any offer is genuine, and where invitations go.
Counts come from stored records, so a label can't drift from what is actually on screen (roadmap 09, "Honest labeling of the demo's seams").
It returns counts and channel facts only, never a challenger identity, an offer amount, or a recipient.
"""

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.provenance import FinancialProvenance, OfferProvenance
from app.models.challenge import Challenge
from app.models.transaction import Transaction
from app.services.outreach import ChannelInfo

# Provenances that came from a real business. demo_data is everything the team simulated,
# including offers typed in live by the seeded demo accounts.
GENUINE_OFFER_PROVENANCES = frozenset(
    {OfferProvenance.challenger_submitted.value, OfferProvenance.captured_off_platform.value}
)


class FinancialDataStatus(BaseModel):
    """Which transaction source is configured and which provenances are actually stored."""

    transaction_source: str
    provenance: list[str]
    has_production_data: bool


class OfferDataStatus(BaseModel):
    """How many active offers exist platform-wide, split by genuine and simulated."""

    total: int
    genuine: int
    captured_off_platform: int
    demo: int
    all_simulated: bool


class OutreachChannelStatus(BaseModel):
    """Where approved invitations go, so the screen can say whether any email really leaves the machine."""

    channel: str
    channel_label: str
    delivers_real_email: bool


class DemoStatus(BaseModel):
    """The seams the demo must state on screen, not just aloud."""

    financial: FinancialDataStatus
    offers: OfferDataStatus
    outreach: OutreachChannelStatus


def get_demo_status(transaction_source: str, outreach_channel: ChannelInfo, db: Session) -> DemoStatus:
    """Return the financial-data and offer-provenance seams from stored records, plus the configured invitation channel."""

    provenance = sorted(db.scalars(select(Transaction.source_type).distinct()).all())
    offer_counts = {
        row.provenance: int(row.count)
        for row in db.execute(
            select(Challenge.provenance, func.count().label("count"))
            .where(Challenge.is_active.is_(True))
            .group_by(Challenge.provenance)
        ).all()
    }
    genuine = sum(count for value, count in offer_counts.items() if value in GENUINE_OFFER_PROVENANCES)
    total = sum(offer_counts.values())

    return DemoStatus(
        financial=FinancialDataStatus(
            transaction_source=transaction_source,
            provenance=provenance,
            has_production_data=FinancialProvenance.production.value in provenance,
        ),
        offers=OfferDataStatus(
            total=total,
            genuine=genuine,
            captured_off_platform=offer_counts.get(OfferProvenance.captured_off_platform.value, 0),
            # Anything not recognizably genuine counts as simulated, so an unexpected
            # provenance value can never inflate the genuine count.
            demo=total - genuine,
            all_simulated=genuine == 0,
        ),
        outreach=OutreachChannelStatus(
            channel=outreach_channel.name,
            channel_label=outreach_channel.label,
            delivers_real_email=outreach_channel.delivers_real_email,
        ),
    )
