"""Encodes a public listing's scope as receptor activations for similarity search.
Reads only the public projection, and only scope fields: never price, vendor, owner, or private records.
"""

import re

from app.services.flybrain import (
    SparseVector,
    encode_log_magnitude,
    encode_tokens,
    merge_vectors,
    scale_vector,
    text_words,
)
from app.services.listings.types import PublicListingProjection

# scope_summary is written by listings/projection.py::_build_scope_summary as
# "location · N sq ft · visit frequency · task, task, task" (tasks optional).
# The positions below mirror that format; change both together.
SUMMARY_SEPARATOR = " · "
SQUARE_FOOTAGE_POSITION = 1
VISIT_FREQUENCY_POSITION = 2
TASKS_POSITION = 3
SQUARE_FOOTAGE_RE = re.compile(r"(\d[\d,]*)\s*sq\s*ft", re.IGNORECASE)
# The projection writes this for unanswered fields; two listings both lacking a
# value must not look similar because of it.
UNANSWERED_MARKER = "not specified"
# Sites within about ±20% of each other's square footage share receptors.
SQUARE_FOOTAGE_STEP_RATIO = 1.1
SQUARE_FOOTAGE_SPREAD = 2

# Relative weight of each channel. The work itself (how often, which tasks, how big)
# decides similarity. Category and cadence are nearly constant in a one-category
# marketplace, so at full weight they made unrelated scopes look alike; area is one
# whole term so a multi-word area name can't outvote the scope.
CHANNEL_WEIGHTS: dict[str, float] = {
    "category": 0.5,
    "cadence": 0.5,
    "area": 1.0,
    "visit_frequency": 2.0,
    "tasks": 1.0,
    "square_footage": 1.5,
}


def listing_scope_terms(projection: PublicListingProjection) -> dict[str, list[str]]:
    """Return whole-token scope terms per channel, used both for encoding and for showing overlap."""

    parts = projection.scope_summary.split(SUMMARY_SEPARATOR)
    visit_frequency = _answered_part(parts, VISIT_FREQUENCY_POSITION)
    tasks_text = SUMMARY_SEPARATOR.join(parts[TASKS_POSITION:])
    area = " ".join(text_words(projection.service_area_approximate))
    return {
        "category": [projection.category.casefold()],
        "cadence": [projection.billing_cadence.casefold()],
        "area": [area] if area else [],
        "visit_frequency": [visit_frequency.casefold()] if visit_frequency else [],
        "tasks": [task.strip().casefold() for task in tasks_text.split(",") if task.strip()],
    }


def listing_scope_receptors(projection: PublicListingProjection, receptor_count: int) -> SparseVector:
    """Encode category, cadence, area, visit frequency, tasks, and site size.

    Price is deliberately absent: "similar" means similar work, and the price is
    shown beside each result rather than used to find it.
    """

    channels = [
        scale_vector(encode_tokens(terms, channel=channel, receptor_count=receptor_count), CHANNEL_WEIGHTS[channel])
        for channel, terms in listing_scope_terms(projection).items()
    ]
    square_feet = _square_feet(projection.scope_summary)
    if square_feet is not None:
        channels.append(
            scale_vector(
                encode_log_magnitude(
                    float(square_feet),
                    channel="square_footage",
                    receptor_count=receptor_count,
                    step_ratio=SQUARE_FOOTAGE_STEP_RATIO,
                    spread=SQUARE_FOOTAGE_SPREAD,
                ),
                CHANNEL_WEIGHTS["square_footage"],
            )
        )
    return merge_vectors(*channels)


def _square_feet(scope_summary: str) -> int | None:
    part = _answered_part(scope_summary.split(SUMMARY_SEPARATOR), SQUARE_FOOTAGE_POSITION)
    match = SQUARE_FOOTAGE_RE.search(part or "")
    if match is None:
        return None
    value = int(match.group(1).replace(",", ""))
    return value if value > 0 else None


def _answered_part(parts: list[str], position: int) -> str | None:
    if position >= len(parts):
        return None
    part = parts[position].strip()
    if not part or UNANSWERED_MARKER in part.casefold():
        return None
    return part
