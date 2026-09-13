"""Turns a stored listing category key into the human label used in search queries and invitations."""

# "cleaning" and "commercial_cleaning" name the same category (see the marketplace category filter),
# so both read the same way to a provider.
_LABELS: dict[str, str] = {
    "cleaning": "Commercial cleaning",
    "commercial_cleaning": "Commercial cleaning",
    "landscaping": "Landscaping",
    "pest_control": "Pest control",
}


def category_label(category: str) -> str:
    """Return a readable label for a category key; unknown keys are de-underscored rather than rejected."""

    key = category.strip().casefold()
    if key in _LABELS:
        return _LABELS[key]
    readable = key.replace("_", " ").strip()
    return readable[:1].upper() + readable[1:] if readable else "Service"
