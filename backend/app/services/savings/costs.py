"""Computes a segment's keep cost, suggested cut, modeled savings and percentage, in integer minor units.
Keep cost = hours × the owner's rate; suggested cut = the same hours × the median public rate; modeled savings = keep
cost − suggested cut − oversight. Code computes every figure; no model output reaches this module (CLAUDE.md).
"""

from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel

from app.core.cadence import convert_cadence
from app.core.money import Money
from app.services.savings.inputs import CardInputs


class SegmentCosts(BaseModel):
    """The computed figures of one card, per the task's billing period unless named annual."""

    hours_total: int | None
    keep_cost_minor: int | None
    suggested_cut_minor: int | None
    suggested_cut_low_minor: int | None
    suggested_cut_high_minor: int | None
    oversight_minor: int | None
    modeled_savings_minor: int | None
    modeled_savings_basis_points: int | None
    annual_savings_minor: int | None
    # True when oversight is unset or any hours are still a draft estimate.
    is_provisional: bool


def compute_costs(inputs: CardInputs, oversight_minor: int | None, currency: str, billing_period: str) -> SegmentCosts:
    """Return the card's figures; a figure whose inputs are missing is None, never zero."""

    hours = [requirement.hours for requirement in inputs.requirements]
    hours_total = sum(value for value in hours if value is not None) if hours and None not in hours else None
    rate = inputs.rate.rate_minor_per_hour
    median = inputs.cut_basis.median_minor

    keep = hours_total * rate if hours_total is not None and rate is not None else None
    cut = hours_total * median if hours_total is not None and median is not None else None
    low = hours_total * inputs.cut_basis.p25_minor if hours_total is not None and inputs.cut_basis.p25_minor is not None else None
    high = hours_total * inputs.cut_basis.p75_minor if hours_total is not None and inputs.cut_basis.p75_minor is not None else None

    savings = keep - cut - (oversight_minor or 0) if keep is not None and cut is not None else None
    basis_points = _basis_points(savings, keep)
    annual = (
        convert_cadence(Money(amount=savings, currency=currency), billing_period, "annual").amount
        if savings is not None
        else None
    )
    is_draft_hours = any(requirement.hours_status != "confirmed" for requirement in inputs.requirements)
    return SegmentCosts(
        hours_total=hours_total,
        keep_cost_minor=keep,
        suggested_cut_minor=cut,
        suggested_cut_low_minor=low,
        suggested_cut_high_minor=high,
        oversight_minor=oversight_minor,
        modeled_savings_minor=savings,
        modeled_savings_basis_points=basis_points,
        annual_savings_minor=annual,
        is_provisional=oversight_minor is None or is_draft_hours,
    )


def _basis_points(savings: int | None, keep: int | None) -> int | None:
    # Percent of keep cost in basis points, rounded once half up; undefined without a positive keep cost.
    if savings is None or keep is None or keep <= 0:
        return None
    value = Decimal(savings) * Decimal(10000) / Decimal(keep)
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
