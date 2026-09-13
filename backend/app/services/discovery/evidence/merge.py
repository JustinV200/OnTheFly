"""Combines two evidence lists for one supplier without repeating a record.
Rediscovery would otherwise append the same award and page on every run.
"""

from app.services.discovery.evidence.records import AwardEvidence, WebEvidence


def merge_evidence(
    existing: list[AwardEvidence | WebEvidence], incoming: list[AwardEvidence | WebEvidence]
) -> list[AwardEvidence | WebEvidence]:
    """Return existing then new records, one per award (by USAspending's unique key) or page URL.

    A record seen again keeps its first position but takes the newer retrieval, so amounts and
    timestamps reflect the latest search the owner ran.
    """

    merged: dict[tuple[str, str], AwardEvidence | WebEvidence] = {}
    for record in [*existing, *incoming]:
        merged[_key(record)] = record
    return list(merged.values())


def _key(record: AwardEvidence | WebEvidence) -> tuple[str, str]:
    if isinstance(record, AwardEvidence):
        return (record.kind, record.generated_award_id or record.award_id)
    return (record.kind, record.url)
