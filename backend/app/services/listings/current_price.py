"""Resolves the single current price a listing publishes and compares offers against.
Amount and cadence always come from one source, so a price can never be shown at another source's cadence.
"""

from pydantic import BaseModel

from app.core.money import Money
from app.models.listing import ScopeVersion
from app.models.service_expense import ServiceExpense


class CurrentPrice(BaseModel):
    """An amount paired with the billing cadence it applies to."""

    amount: Money
    cadence: str

    model_config = {"arbitrary_types_allowed": True}


def resolve_current_price(expense: ServiceExpense, scope: ScopeVersion) -> CurrentPrice:
    """Return the owner-confirmed price when the scope states one in full, else the transaction baseline."""

    # Owner confirmation wins over the inferred payment pattern (roadmap 04, publish step 2:
    # "confirm the current-price baseline from phase 03"). A scope carrying only a price or
    # only a cadence would pair values from two sources, so a partial statement is ignored.
    if scope.current_price_minor is not None and scope.billing_cadence:
        return CurrentPrice(
            amount=Money(amount=scope.current_price_minor, currency=scope.current_price_currency),
            cadence=scope.billing_cadence.strip().casefold(),
        )
    return CurrentPrice(
        amount=Money(amount=expense.amount_minor_per_period, currency=expense.currency),
        cadence=expense.cadence,
    )
