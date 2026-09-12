"""The one ordering rule shared by the owner's ranking and the public leaderboard.
Offers on the listing's current scope come first, offers on earlier scope versions follow as their own group,
and offers that can't be compared at all come last.
"""

# Group order. An earlier-version offer's completeness and price were measured against a different scope
# (and possibly a different price), so it is never interleaved with offers on the current one.
_CURRENT_SCOPE_GROUP = 0
_EARLIER_SCOPE_GROUP = 1
_UNRANKED_GROUP = 2


def offer_sort_key(
    *,
    is_ranked: bool,
    is_current_scope_version: bool,
    answered_scope_version_number: int,
    scope_completeness: float,
    normalized_price_minor: int,
) -> tuple[int, int, float, int]:
    """Return a sort key: group, then newest answered version, then completeness, then monthly price.

    Assumes every ranked offer in one (group, version) block shares that version's currency, which the
    callers guarantee by marking any other currency unranked. Unranked offers get a constant key, so a
    stable sort keeps their input order and no price in another currency is ever compared.
    """

    if not is_ranked:
        return (_UNRANKED_GROUP, 0, 0.0, 0)
    group = _CURRENT_SCOPE_GROUP if is_current_scope_version else _EARLIER_SCOPE_GROUP
    # Newest version first inside the earlier group, so offers on the same old scope stay together.
    return (group, -answered_scope_version_number, -scope_completeness, normalized_price_minor)
