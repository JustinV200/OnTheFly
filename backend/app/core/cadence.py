"""Restates Money amounts per month for a named billing cadence.
Only regular cadences convert; irregular spend has no monthly figure and raises rather than guessing.
"""

from decimal import Decimal

from app.core.money import Money

# Per-month multiplier for each regular cadence. The challenge input schema's
# BillingFrequency literal must stay in sync with these keys.
MONTHLY_FACTORS: dict[str, Decimal] = {
    "weekly": Decimal("52") / Decimal("12"),
    "biweekly": Decimal("26") / Decimal("12"),
    "monthly": Decimal("1"),
    "quarterly": Decimal("1") / Decimal("3"),
    "annual": Decimal("1") / Decimal("12"),
    "yearly": Decimal("1") / Decimal("12"),
}


class UnsupportedCadenceError(ValueError):
    """Raised when a cadence has no deterministic monthly conversion."""


def to_monthly(amount: Money, cadence: str) -> Money:
    """Return the amount restated per month; raises for cadences such as irregular."""

    factor = MONTHLY_FACTORS.get(cadence.strip().casefold())
    if factor is None:
        raise UnsupportedCadenceError(f"Unsupported billing cadence: {cadence}")
    return amount.multiply_by(factor)
