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
    "bimonthly": Decimal("1") / Decimal("2"),
    "quarterly": Decimal("1") / Decimal("3"),
    "annual": Decimal("1") / Decimal("12"),
    "yearly": Decimal("1") / Decimal("12"),
}


class UnsupportedCadenceError(ValueError):
    """Raised when a cadence has no deterministic monthly conversion."""


def to_monthly(amount: Money, cadence: str) -> Money:
    """Return the amount restated per month; raises for cadences such as irregular."""

    return amount.multiply_by(_monthly_factor(cadence))


def convert_cadence(amount: Money, from_cadence: str, to_cadence: str) -> Money:
    """Return the amount restated from one regular cadence to another, rounded once (half up).

    The ratio of the two monthly factors is taken before rounding, so weekly → annual is exactly ×52 rather
    than a monthly figure rounded and then multiplied. Raises UnsupportedCadenceError for irregular cadences.
    """

    return amount.multiply_by(_monthly_factor(from_cadence) / _monthly_factor(to_cadence))


def is_regular_cadence(cadence: str | None) -> bool:
    """Return True when the cadence has a deterministic monthly conversion."""

    return cadence is not None and cadence.strip().casefold() in MONTHLY_FACTORS


def _monthly_factor(cadence: str) -> Decimal:
    factor = MONTHLY_FACTORS.get(cadence.strip().casefold())
    if factor is None:
        raise UnsupportedCadenceError(f"Unsupported billing cadence: {cadence}")
    return factor
