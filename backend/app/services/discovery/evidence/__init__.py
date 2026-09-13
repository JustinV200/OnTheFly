"""Source-attributable evidence on discovered providers: typed records, their stored JSON form, and merging."""

from app.services.discovery.evidence.merge import merge_evidence
from app.services.discovery.evidence.records import (
    AwardEvidence,
    CandidateEvidence,
    WebEvidence,
    evidence_json,
    parse_evidence_json,
)

__all__ = [
    "AwardEvidence",
    "CandidateEvidence",
    "WebEvidence",
    "evidence_json",
    "merge_evidence",
    "parse_evidence_json",
]
