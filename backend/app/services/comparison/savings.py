"""Computes potential savings between the incumbent baseline and a challenge.
Unknown costs remain explicitly provisional instead of being hidden as certainty.
"""

from pydantic import BaseModel

from app.core.money import Money


class SavingsResult(BaseModel):
    """Represents potential recurring and first-year savings for one offer."""

    annual_recurring_savings: Money
    first_year_net_savings: Money
    is_provisional: bool
    assumptions: list[str]
    label: str

    model_config = {"arbitrary_types_allowed": True}



def compute_savings(
    current_monthly: Money,
    offer_monthly: Money,
    setup_fee_minor: int | None,
    switching_cost_minor: int | None = None,
    cancellation_fee_minor: int | None = None,
    missing_scope_items: list[str] | None = None,
    unstated_scope_items: list[str] | None = None,
    label_base: str = "Potential savings",
    annual_recurring_difference: Money | None = None,
) -> SavingsResult:
    """Compute potential savings, provisional when costs are unknown or the offer's scope differs.

    Scope gaps come first in the assumptions: an offer that drops requested work is not a
    like-for-like price, so its "savings" partly measure doing less (CLAUDE.md, money and math).
    label_base names what the difference is for the task's origin: a new task compares against a budget and never
    says "savings" (plan2, "Tasks and ownership").
    annual_recurring_difference, when given, is the baseline minus the offer with each side restated per year from its
    own cadence; it replaces (monthly difference × 12), which carries the monthly figures' rounding into the year (a
    $1,298,000 yearly offer is $108,166.67 a month, and ×12 that is $1,298,000.04).
    """

    annual_recurring = (
        annual_recurring_difference
        if annual_recurring_difference is not None
        else current_monthly.subtract(offer_monthly).multiply_by(12)
    )
    assumptions: list[str] = []

    if missing_scope_items:
        assumptions.append(f"offer does not cover requested scope: {', '.join(missing_scope_items)}")
    if unstated_scope_items:
        assumptions.append(f"offer does not state: {', '.join(unstated_scope_items)}")
    setup_fee = _known_or_zero(setup_fee_minor, "setup fee not provided", assumptions)
    switching_cost = _known_or_zero(switching_cost_minor, "switching cost not provided", assumptions)
    cancellation_fee = _known_or_zero(cancellation_fee_minor, "cancellation fee not provided", assumptions)
    provisional = bool(assumptions)

    first_year_net = annual_recurring
    first_year_net = first_year_net.subtract(Money(amount=setup_fee, currency=current_monthly.currency))
    first_year_net = first_year_net.subtract(Money(amount=switching_cost, currency=current_monthly.currency))
    first_year_net = first_year_net.subtract(Money(amount=cancellation_fee, currency=current_monthly.currency))

    return SavingsResult(
        annual_recurring_savings=annual_recurring,
        first_year_net_savings=first_year_net,
        is_provisional=provisional,
        assumptions=assumptions,
        # Every figure is provisional while switching costs are unknown, so the flag alone
        # can't tell a scope gap apart; the label has to.
        label=f"{label_base} (scope gaps)" if missing_scope_items else label_base,
    )


def _known_or_zero(value: int | None, assumption: str, assumptions: list[str]) -> int:
    if value is None:
        assumptions.append(assumption)
        return 0
    return value
