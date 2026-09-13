"""Groups a task's retained requirements into segments: confirmed labor category, PSC and NAICS (plan2, "Ways to save").
Grouping is deterministic code; a requirement with draft or missing tags joins no segment and is listed as such.
"""

from collections.abc import Sequence

from pydantic import BaseModel

from app.models.scope import Requirement


class Segment(BaseModel):
    """Requirements that could be split off together."""

    key: str
    labor_category: str
    psc: str
    naics: str
    requirements: list[Requirement]

    model_config = {"arbitrary_types_allowed": True}


class Segmentation(BaseModel):
    """The segments, plus the requirements left out and why."""

    segments: list[Segment]
    untagged: list[Requirement]

    model_config = {"arbitrary_types_allowed": True}


def build_segments(requirements: Sequence[Requirement]) -> Segmentation:
    """Return segments in first-seen order; requirements without confirmed tags are returned as untagged."""

    grouped: dict[str, Segment] = {}
    untagged: list[Requirement] = []
    for requirement in requirements:
        if requirement.tags_status != "confirmed" or not (requirement.labor_category and requirement.psc and requirement.naics):
            untagged.append(requirement)
            continue
        key = segment_key(requirement.labor_category, requirement.psc, requirement.naics)
        if key not in grouped:
            grouped[key] = Segment(
                key=key,
                labor_category=requirement.labor_category,
                psc=requirement.psc,
                naics=requirement.naics,
                requirements=[],
            )
        grouped[key].requirements.append(requirement)
    return Segmentation(segments=list(grouped.values()), untagged=untagged)


def segment_key(labor_category: str, psc: str, naics: str) -> str:
    """Return the stable identity of a segment, used to carry dismissals and oversight across recomputations."""

    return f"{labor_category}|{psc.upper()}|{naics}"
