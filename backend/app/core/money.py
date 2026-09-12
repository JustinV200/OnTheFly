"""Provides a Money value object for deterministic currency arithmetic.
It supports display helpers but never permits cross-currency math.
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True, slots=True)
class Money:
    """Represents an amount in minor units for one explicit currency."""

    amount: int
    currency: str

    def add(self, other: "Money") -> "Money":
        """Return the sum of two Money values in the same currency."""

        self._assert_same_currency(other)
        return Money(amount=self.amount + other.amount, currency=self.currency)

    def subtract(self, other: "Money") -> "Money":
        """Return the difference of two Money values in the same currency."""

        self._assert_same_currency(other)
        return Money(amount=self.amount - other.amount, currency=self.currency)

    def multiply_by(self, factor: int | Decimal) -> "Money":
        """Return a scaled Money value using integer or Decimal multiplication."""

        decimal_factor = factor if isinstance(factor, Decimal) else Decimal(factor)
        scaled = (Decimal(self.amount) * decimal_factor).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
        return Money(amount=int(scaled), currency=self.currency)

    def to_display(self) -> str:
        """Return a simple human display string such as "$24.00"."""

        sign = "-" if self.amount < 0 else ""
        absolute = abs(self.amount)
        units = absolute // 100
        cents = absolute % 100
        symbol = "$" if self.currency.upper() == "USD" else f"{self.currency.upper()} "
        return f"{sign}{symbol}{units}.{cents:02d}"

    def to_float_for_display(self) -> float:
        """Return a float only for presentation code that needs decimals."""

        return self.amount / 100.0

    def _assert_same_currency(self, other: "Money") -> None:
        if self.currency != other.currency:
            raise ValueError("Money operations require matching currencies")


ZERO_USD = Money(amount=0, currency="USD")
