"""Computes a median of integer minor-unit amounts with explicit, deterministic rounding."""

from decimal import Decimal, ROUND_HALF_UP


def median_minor(amounts: list[int]) -> int:
    """Return the median amount in minor units; an even count averages the middle two.

    A half-unit result rounds half up, matching Money.multiply_by, so the same inputs
    always produce the same integer. Raises for an empty list rather than inventing a price.
    """

    if not amounts:
        raise ValueError("Cannot take the median of no amounts")
    ordered = sorted(amounts)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    total = Decimal(ordered[middle - 1] + ordered[middle])
    return int((total / 2).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def change_basis_points(previous_minor: int, new_minor: int) -> int:
    """Return the relative change from previous to new in basis points (1% = 100), rounded half up."""

    if previous_minor <= 0:
        raise ValueError("A relative change needs a positive previous amount")
    ratio = Decimal(new_minor - previous_minor) * Decimal(10000) / Decimal(previous_minor)
    return int(ratio.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
