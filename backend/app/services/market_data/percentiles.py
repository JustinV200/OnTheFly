"""Computes labor-rate percentiles in integer minor units: the median and interquartile range a card prices with.
Linear interpolation between order statistics, computed in Decimal and rounded once, half up, so results never drift.
"""

from collections.abc import Sequence
from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel


class RatePercentiles(BaseModel):
    """The 25th, 50th and 75th percentile of a rate sample, per hour."""

    p25_minor: int
    median_minor: int
    p75_minor: int
    sample_size: int


def rate_percentiles(rates_minor: Sequence[int]) -> RatePercentiles | None:
    """Return the percentiles of a non-empty sample, or None for an empty one (no rate, never zero)."""

    if not rates_minor:
        return None
    ordered = sorted(rates_minor)
    return RatePercentiles(
        p25_minor=_percentile(ordered, Decimal("0.25")),
        median_minor=_percentile(ordered, Decimal("0.5")),
        p75_minor=_percentile(ordered, Decimal("0.75")),
        sample_size=len(ordered),
    )


def _percentile(ordered: list[int], fraction: Decimal) -> int:
    position = fraction * Decimal(len(ordered) - 1)
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(ordered) - 1)
    weight = position - Decimal(lower_index)
    value = Decimal(ordered[lower_index]) + (Decimal(ordered[upper_index]) - Decimal(ordered[lower_index])) * weight
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
