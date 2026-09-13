"""Counts distinct suppliers in award evidence by UEI only (CLAUDE.md, "Adverse records require an identifier-level match").
Names never merge two suppliers, and a record without a UEI is listed but not counted, so counts are floors.
"""

from collections.abc import Sequence

from pydantic import BaseModel

from app.services.market_data.source import AwardRecord


class SupplierCount(BaseModel):
    """The deduplicated supplier count behind a card."""

    distinct_uei_count: int
    award_count: int
    records_without_uei: int
    prime_award_count: int
    subaward_count: int


def count_suppliers(records: Sequence[AwardRecord]) -> SupplierCount:
    """Return distinct suppliers by normalized UEI; records lacking one are counted apart and never as suppliers."""

    ueis = {record.uei.strip().upper() for record in records if record.uei and record.uei.strip()}
    return SupplierCount(
        distinct_uei_count=len(ueis),
        award_count=len(records),
        records_without_uei=sum(1 for record in records if not (record.uei and record.uei.strip())),
        prime_award_count=sum(1 for record in records if record.award_type == "prime"),
        subaward_count=sum(1 for record in records if record.award_type == "subaward"),
    )
