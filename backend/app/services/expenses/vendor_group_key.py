"""Builds and reads the key a vendor group is stored under.
Stripe groups are keyed per currency ("Sparkle Clean [USD]"); every other provider's key is the plain name.
The currency-free name is what correction rules store and what alias similarity compares.
"""

STRIPE_PROVIDER = "stripe"


def vendor_group_key(vendor_name: str, provider: str, currency: str) -> str:
    """Return the grouping key for a resolved vendor name.

    Stripe charges in different currencies must never share a baseline, so their key
    carries the currency. The suffix is idempotent: a name that already ends with it
    (for example a correction rule saved from a suffixed key) still gets exactly one.
    Other providers keep the plain name so existing fixture grouping keys don't change.
    """

    if provider != STRIPE_PROVIDER:
        return vendor_name
    return f"{base_vendor_name(vendor_name, currency)}{_currency_suffix(currency)}"


def base_vendor_name(vendor_key: str, currency: str) -> str:
    """Return the vendor name without any trailing " [CUR]" suffix for this currency.

    Strips repeated suffixes, so a key corrupted by an earlier double suffix reads back
    as the plain name. A key without the suffix, or with another currency's, is returned unchanged.
    """

    suffix = _currency_suffix(currency)
    name = vendor_key
    while name.endswith(suffix) and len(name) > len(suffix):
        name = name[: -len(suffix)]
    return name


def is_currency_keyed(vendor_key: str, currency: str) -> bool:
    """Return True when the key carries its currency suffix, i.e. it is a Stripe group's key."""

    return base_vendor_name(vendor_key, currency) != vendor_key


def _currency_suffix(currency: str) -> str:
    return f" [{currency}]"
