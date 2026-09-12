"""Checks that an offer's currency is the one its listing is priced in.
Savings subtract each offer from the listing's baseline and Money refuses cross-currency math, so an offer in
another currency can't be ranked, and there is no conversion basis to rank it by. This module stores nothing.
"""


def find_offer_currency_problem(offered_currency: str | None, listing_currency: str) -> str | None:
    """Return a sentence saying why an offer's currency can't be accepted, or None when it can.

    offered_currency is what the caller sent, or None when it sent nothing, which is always accepted.
    Codes are compared upper-cased and trimmed, so "usd" matches a USD listing. Callers store the
    listing's own code on the offer either way, never the value sent here.
    """

    if offered_currency is None:
        return None
    if offered_currency.strip().upper() == listing_currency.strip().upper():
        return None
    return (
        f"This listing is priced in {listing_currency}, so offers must be in {listing_currency} too "
        f"(received '{offered_currency}')."
    )
