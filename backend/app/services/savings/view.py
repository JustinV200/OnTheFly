"""Shapes a stored card for its owner's screen: figures, sources, what wasn't checked, thresholds and the honesty label.
Owner-only. Nothing here is ever part of a public projection.
"""

from datetime import datetime
import json

from pydantic import BaseModel

from app.models.savings import SavingsCard
from app.services.savings.costs import compute_costs
from app.services.savings.inputs import CardInputs
from app.services.savings.thresholds import SavingsThresholds


class SavingsCardView(BaseModel):
    """One card as its owner sees it."""

    id: str
    status: str
    tier: str
    label: str
    reasons: list[str]
    labor_category: str
    psc: str
    naics: str
    currency: str
    billing_period: str
    inputs: CardInputs
    hours_total: int | None
    keep_cost_minor: int | None
    suggested_cut_minor: int | None
    suggested_cut_low_minor: int | None
    suggested_cut_high_minor: int | None
    oversight_minor: int | None
    modeled_savings_minor: int | None
    modeled_savings_basis_points: int | None
    annual_savings_minor: int | None
    is_provisional: bool
    evidence_ids: list[str]
    sources_not_checked: list[str]
    thresholds: SavingsThresholds
    computed_at: datetime


def card_view(card: SavingsCard) -> SavingsCardView:
    """Return the card with its costs recomputed from stored inputs, so the screen shows exactly what they give."""

    inputs = CardInputs.model_validate_json(card.inputs_json)
    costs = compute_costs(inputs, card.oversight_minor, card.currency, card.billing_period)
    return SavingsCardView(
        id=card.id,
        status=card.status,
        tier=card.tier,
        label=card_label(inputs),
        reasons=json.loads(card.reasons_json),
        labor_category=inputs.labor_category,
        psc=inputs.psc,
        naics=inputs.naics,
        currency=card.currency,
        billing_period=card.billing_period,
        inputs=inputs,
        hours_total=costs.hours_total,
        keep_cost_minor=costs.keep_cost_minor,
        suggested_cut_minor=costs.suggested_cut_minor,
        suggested_cut_low_minor=costs.suggested_cut_low_minor,
        suggested_cut_high_minor=costs.suggested_cut_high_minor,
        oversight_minor=costs.oversight_minor,
        modeled_savings_minor=costs.modeled_savings_minor,
        modeled_savings_basis_points=costs.modeled_savings_basis_points,
        annual_savings_minor=costs.annual_savings_minor,
        is_provisional=costs.is_provisional,
        evidence_ids=json.loads(card.evidence_ids_json),
        sources_not_checked=sources_not_checked(inputs),
        thresholds=SavingsThresholds.model_validate_json(card.thresholds_json),
        computed_at=card.computed_at,
    )


def card_label(inputs: CardInputs) -> str:
    """Return the card's honesty label; demo evidence is never described as public pricing."""

    if inputs.cut_basis.provenance == "demo_data" or inputs.suppliers.provenance == "demo_data":
        return "Modeled cut from demo market data — not an offer"
    return "Modeled cut from public pricing — not an offer"


def sources_not_checked(inputs: CardInputs) -> list[str]:
    """List every source or check that did not run for this card, so the ones that did never look comprehensive."""

    missing: list[str] = []
    if inputs.suppliers.status == "unavailable":
        missing.append("Award and subaward suppliers")
    if inputs.cut_basis.status == "unavailable":
        missing.append("Public labor rates")
    eligibility_kinds = [kind for kind in inputs.constraint_kinds if kind in ("clearance", "set_aside", "insurance")]
    if eligibility_kinds:
        readable = ", ".join(kind.replace("_", "-") for kind in eligibility_kinds)
        missing.append(f"Whether counted suppliers meet the inherited constraints ({readable}): no identifier-level source")
    return missing
