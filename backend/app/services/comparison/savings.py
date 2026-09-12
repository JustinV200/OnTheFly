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
) -> SavingsResult:
    """Compute potential savings while flagging unknown switching costs as provisional."""

    annual_recurring = current_monthly.subtract(offer_monthly).multiply_by(12)
    assumptions: list[str] = []
    provisional = False

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
        label="Potential savings",
    )


def _known_or_zero(value: int | None, assumption: str, assumptions: list[str]) -> int:
    if value is None:
        assumptions.append(assumption)
        return 0
    return value
