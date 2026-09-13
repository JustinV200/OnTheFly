"""Decides a card's tier from its costs, evidence and the configured thresholds.
potential_savings needs every condition; a failure is named in words, and thresholds are never adjusted to pass.
"""

from typing import Literal

from pydantic import BaseModel

from app.services.savings.costs import SegmentCosts
from app.services.savings.inputs import CardInputs
from app.services.savings.thresholds import SavingsThresholds

Tier = Literal["potential_savings", "specialist_market", "needs_rates", "not_viable"]


class Viability(BaseModel):
    """A card's tier and the plain-language reasons for it."""

    tier: Tier
    reasons: list[str]


def classify(inputs: CardInputs, costs: SegmentCosts, thresholds: SavingsThresholds) -> Viability:
    """Return the tier.

    needs_rates: the owner has no rate for the labor category, so nothing piece-specific can be said.
    potential_savings: savings reach both thresholds, suppliers by UEI reach the minimum, and the cut fits.
    specialist_market: enough suppliers, but no public rate matched or savings aren't positive.
    not_viable: anything else, with each failed condition listed.
    """

    if inputs.rate.rate_minor_per_hour is None:
        return Viability(tier="needs_rates", reasons=[f"Add your rate for {inputs.labor_category} to find specific savings."])

    supplier_reasons = _supplier_reasons(inputs, thresholds)
    has_enough_suppliers = not supplier_reasons
    if costs.hours_total is None:
        return Viability(tier="not_viable", reasons=["Some hours are unanswered, so this segment can't be priced.", *supplier_reasons])
    if inputs.cut_basis.status == "unavailable":
        return Viability(tier="not_viable", reasons=["Public labor rates: not checked.", *supplier_reasons])

    savings = costs.modeled_savings_minor
    if savings is None or savings <= 0:
        if has_enough_suppliers:
            return Viability(
                tier="specialist_market",
                reasons=["Specialist market: enough suppliers, but no modeled savings against your own rate."],
            )
        return Viability(tier="not_viable", reasons=["No modeled savings against your own rate.", *supplier_reasons])

    reasons = list(supplier_reasons)
    basis_points = costs.modeled_savings_basis_points or 0
    if basis_points < thresholds.min_basis_points:
        reasons.append(
            f"Modeled savings are {basis_points / 100:.2f}% of keep cost, below the {thresholds.min_basis_points / 100:.2f}% minimum."
        )
    if (costs.annual_savings_minor or 0) < thresholds.min_annual_minor:
        reasons.append(f"Modeled savings are below the {thresholds.min_annual_minor / 100:,.2f} a year minimum.")
    if inputs.remainder_minor is None:
        reasons.append("This task has no starting price, so no cut can fit it.")
    elif (costs.suggested_cut_minor or 0) > inputs.remainder_minor:
        reasons.append("The suggested cut doesn't fit your remainder.")
    if reasons:
        return Viability(tier="not_viable", reasons=reasons)
    return Viability(tier="potential_savings", reasons=["Every condition holds at the thresholds shown."])


def _supplier_reasons(inputs: CardInputs, thresholds: SavingsThresholds) -> list[str]:
    # Unavailable is "not checked", never zero suppliers; no match is "no match found in this source".
    status = inputs.suppliers.status
    distinct = inputs.suppliers.count.distinct_uei_count
    if status == "unavailable":
        return ["Suppliers: not checked."]
    if status == "no_match":
        return ["Suppliers: no match found in this source."]
    if distinct < thresholds.min_suppliers:
        return [f"{distinct} distinct supplier(s) by UEI, below the minimum of {thresholds.min_suppliers}."]
    return []
