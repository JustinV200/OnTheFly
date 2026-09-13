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

    stated = resolve_stated_price(scope)
    if stated is not None:
        return stated
    return CurrentPrice(
        amount=Money(amount=expense.amount_minor_per_period, currency=expense.currency),
        cadence=expense.cadence,
    )


def resolve_stated_price(scope: ScopeVersion) -> CurrentPrice | None:
    """Return the price the scope states in full (amount and cadence), or None when it states no complete price.

    For a new task this is the owner's budget and for a piece its cut; neither has transactions to fall back to,
    so None means "no price", never zero.
    """

    # Owner confirmation wins over the inferred payment pattern (roadmap 04, publish step 2:
    # "confirm the current-price baseline from phase 03"). A scope carrying only a price or
    # only a cadence would pair values from two sources, so a partial statement is ignored.
    if scope.current_price_minor is not None and scope.billing_cadence:
        return CurrentPrice(
            amount=Money(amount=scope.current_price_minor, currency=scope.current_price_currency),
            cadence=scope.billing_cadence.strip().casefold(),
        )
    return None


def resolve_task_price(expense: ServiceExpense | None, scope: ScopeVersion) -> CurrentPrice | None:
    """Return a listing's current price whatever its origin: the rebid rule with an expense, the stated price without."""

    if expense is not None:
        return resolve_current_price(expense, scope)
    return resolve_stated_price(scope)
