"""Decides whether an offer's currency can be compared with the price it is measured against.
There is no conversion basis on this platform, so a mismatch is reported, never converted or guessed.
"""


def currency_mismatch_reason(offer_currency: str, reference_currency: str) -> str | None:
    """Return why an offer can't be ranked or given savings, or None when the two currencies match.

    The match is exact on purpose: Money refuses arithmetic between "usd" and "USD", and CLAUDE.md
    (money and math) keeps currencies separate absent an explicit conversion basis.
    """

    if offer_currency == reference_currency:
        return None
    return (
        f"offer currency {offer_currency} differs from the listing's {reference_currency}, "
        "so it is not ranked and no savings are computed"
    )
