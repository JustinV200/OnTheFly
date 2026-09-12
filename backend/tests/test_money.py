"""Covers the Money value object's arithmetic and display behavior."""

from decimal import Decimal

import pytest

from app.core.money import Money


def test_money_arithmetic_and_display() -> None:
    amount = Money(amount=2400, currency="USD")
    other = Money(amount=600, currency="USD")

    assert amount.add(other).amount == 3000
    assert amount.subtract(other).amount == 1800
    assert amount.multiply_by(Decimal("1.5")).amount == 3600
    assert amount.to_display() == "$24.00"
    assert amount.to_float_for_display() == 24.0


def test_money_refuses_currency_mismatch() -> None:
    with pytest.raises(ValueError, match="matching currencies"):
        Money(amount=100, currency="USD").add(Money(amount=100, currency="CAD"))
