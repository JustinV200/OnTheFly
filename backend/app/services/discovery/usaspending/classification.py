"""Maps a listing category to the NAICS industries USAspending discovery searches.
Only categories with a recorded mapping search awards; any other category reports discovery as not run
rather than searching an industry the listing isn't in.
"""

_NAICS_BY_CATEGORY: dict[str, tuple[str, ...]] = {
    # 541512 Computer Systems Design Services (the GovCon ledger's DevSecOps code); 541519 Other Computer
    # Related Services, where DevSecOps support is also awarded.
    "devsecops": ("541512", "541519"),
    # 561720 Janitorial Services. "commercial_cleaning" is an older stored key for the same category.
    "cleaning": ("561720",),
    "commercial_cleaning": ("561720",),
    # 561730 Landscaping Services.
    "landscaping": ("561730",),
    # 561710 Exterminating and Pest Control Services.
    "pest_control": ("561710",),
}


def naics_codes_for(category: str) -> tuple[str, ...]:
    """Return the NAICS codes searched for a category key; empty when the category has no mapping."""

    return _NAICS_BY_CATEGORY.get(category.strip().casefold(), ())
