"""Restates an offer's recurring price in a task's billing period, the one period every figure on a task uses.
A setup fee is one-time, so it is never part of a recurring price; money views show it separately where needed.
"""

from app.core.cadence import convert_cadence
from app.core.money import Money
from app.models.challenge import Challenge


def offer_price_in_period(challenge: Challenge, billing_period: str) -> Money:
    """Return the offer's price per the given period, rounded once (half up) by convert_cadence.

    The challenge schema restricts billing_frequency to regular cadences, so this does not raise for API offers.
    """

    return convert_cadence(
        Money(amount=challenge.price_minor, currency=challenge.price_currency),
        challenge.billing_frequency,
        billing_period,
    )
