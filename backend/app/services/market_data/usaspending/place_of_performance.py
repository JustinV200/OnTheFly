"""Reads US states out of a free-text service area ("Northern Virginia", "Arlington, VA", "DC metro").
Only whole state names and upper-case postal codes count; an area it can't read yields no states, and the caller
then searches nationwide and says so rather than guessing a state.
"""

import re

_STATE_CODES_BY_NAME: dict[str, str] = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO",
    "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA",
    "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA",
    "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
    "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY",
}
_STATE_CODES = frozenset(_STATE_CODES_BY_NAME.values()) | {"DC"}
# The District is matched first and removed, so "Washington, DC" never also reads as Washington state.
_DISTRICT = re.compile(r"\bdistrict of columbia\b|\bwashington,?\s+d\.?\s?c\b\.?|\bd\.c\.|\bdc\b", re.IGNORECASE)
# Longest names first, so "West Virginia" is consumed before "Virginia" can match inside it.
_STATE_NAME = re.compile(
    r"\b(" + "|".join(sorted(_STATE_CODES_BY_NAME, key=len, reverse=True)).replace(" ", r"\s+") + r")\b",
    re.IGNORECASE,
)
# Upper case only: "or", "in" and "me" are ordinary words in lower case.
_POSTAL_CODE = re.compile(r"\b[A-Z]{2}\b")


def states_in_area(service_area: str) -> list[str]:
    """Return the sorted two-letter codes of every state the area names; empty when it names none unambiguously."""

    found: set[str] = set()
    remaining, district_mentions = _DISTRICT.subn(" ", service_area)
    if district_mentions:
        found.add("DC")

    def take_name(match: re.Match[str]) -> str:
        found.add(_STATE_CODES_BY_NAME[" ".join(match.group(1).casefold().split())])
        return " "

    remaining = _STATE_NAME.sub(take_name, remaining)
    found.update(code for code in _POSTAL_CODE.findall(remaining) if code in _STATE_CODES)
    return sorted(found)
