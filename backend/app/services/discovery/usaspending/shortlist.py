"""Turns USAspending awards into a ranked supplier shortlist, one provider per UEI.
Awards without a UEI never become providers: a name alone doesn't identify an award recipient.
"""

from collections import defaultdict
from datetime import datetime

from app.core.provenance import ProviderCandidateProvenance
from app.services.discovery.evidence import AwardEvidence
from app.services.discovery.types import DiscoveredProvider
from app.services.market_data.usaspending import UsaSpendingAward

MAX_SHORTLIST = 10


def shortlist_suppliers(awards: list[UsaSpendingAward], retrieved_at: datetime) -> list[DiscoveredProvider]:
    """Return up to MAX_SHORTLIST suppliers ranked by award count, then total award amount, then UEI.

    The ranking uses only counts, integer amounts and the identifier, so the same response always
    yields the same shortlist. Each provider carries every one of its awards as evidence, in response order.
    """

    awards_by_uei: dict[str, list[UsaSpendingAward]] = defaultdict(list)
    for award in awards:
        if award.recipient_uei:
            awards_by_uei[award.recipient_uei].append(award)

    ranked = sorted(
        awards_by_uei.items(),
        key=lambda item: (-len(item[1]), -sum(award.amount_minor or 0 for award in item[1]), item[0]),
    )[:MAX_SHORTLIST]
    return [_provider(uei, supplier_awards, retrieved_at) for uei, supplier_awards in ranked]


def _provider(uei: str, awards: list[UsaSpendingAward], retrieved_at: datetime) -> DiscoveredProvider:
    evidence = [_evidence(award, uei, retrieved_at) for award in awards]
    return DiscoveredProvider(
        # The name on the recipient's largest award; the UEI, not the name, is what identifies them.
        business_name=awards[0].recipient_name,
        # USAspending records where past work was performed, which is not a claim about current coverage.
        service_area=None,
        supplier_uei=uei,
        source_urls=[record.url for record in evidence if record.url],
        evidence=evidence,
        provenance=ProviderCandidateProvenance.public_award.value,
    )


def _evidence(award: UsaSpendingAward, uei: str, retrieved_at: datetime) -> AwardEvidence:
    return AwardEvidence(
        award_id=award.award_id,
        generated_award_id=award.generated_award_id,
        url=award.url,
        recipient_uei=uei,
        awarding_agency=award.awarding_agency,
        amount_minor=award.amount_minor,
        start_date=award.start_date,
        naics_code=award.naics_code,
        psc_code=award.psc_code,
        place_of_performance_state=award.place_of_performance_state,
        retrieved_at=retrieved_at,
    )
