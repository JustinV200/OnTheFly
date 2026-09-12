"""Checks that an offer's money amounts are ones the comparison math can rank honestly.
Ranking sorts by normalized price and savings subtract the offer, so a zero or negative amount would
top the leaderboard and inflate potential savings. This module only judges amounts; it stores nothing.
"""


def find_offer_amount_problem(price_minor: int, setup_fee_minor: int) -> str | None:
    """Return a sentence saying what is wrong with an offer's amounts, or None when both are valid.

    Both amounts are integer minor units in the offer's currency. The price must be positive.
    The setup fee may be zero, meaning none, but never negative.
    """

    if price_minor <= 0:
        return "Offer price must be greater than zero."
    if setup_fee_minor < 0:
        return "Setup fee can't be negative. Use 0 when there is no setup fee."
    return None
