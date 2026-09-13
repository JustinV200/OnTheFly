"""Deterministic provider identity keys: registrable domain, normalized name, and phone digits.
Used to collapse duplicates only; a match here never attaches any record or claim to a business.
"""

from dataclasses import dataclass
import re

from app.services.discovery.filters.domain import registrable_domain

# Entity suffixes carry no identity ("Bay Clean LLC" is "Bay Clean"), mirroring the evidence matcher's list.
_ENTITY_SUFFIXES = frozenset({"co", "company", "corp", "corporation", "inc", "incorporated", "llc", "ltd"})
_NON_WORD = re.compile(r"[^a-z0-9]+")
# Shorter digit runs are extensions or fragments, not a number two listings could share by accident.
_MIN_PHONE_DIGITS = 7


@dataclass(frozen=True)
class ProviderIdentity:
    """The comparable keys for one provider; any key may be missing."""

    domain: str | None
    name: str | None
    phone: str | None

    def matches(self, other: "ProviderIdentity") -> bool:
        """Return True when two providers are the same business by domain, phone, or name.

        A name match is ignored when both sides have different domains: two unrelated companies
        can share a name ("ABC Cleaning" in two towns), but not a website.
        """

        if self.domain and self.domain == other.domain:
            return True
        if self.phone and self.phone == other.phone:
            return True
        domains_conflict = bool(self.domain and other.domain and self.domain != other.domain)
        return bool(self.name and self.name == other.name and not domains_conflict)


def identity_of(business_name: str, website_url: str | None, phone: str | None) -> ProviderIdentity:
    """Build the identity keys for one provider from its name, website, and phone."""

    return ProviderIdentity(
        domain=registrable_domain(website_url),
        name=normalize_business_name(business_name) or None,
        phone=_phone_digits(phone),
    )


def normalize_business_name(business_name: str) -> str:
    """Lowercase, drop punctuation and entity suffixes, and collapse whitespace."""

    words = _NON_WORD.sub(" ", business_name.casefold()).split()
    while words and words[-1] in _ENTITY_SUFFIXES:
        words.pop()
    return " ".join(words)


def build_dedupe_key(business_name: str, website_url: str | None, supplier_uei: str | None = None) -> str:
    """Return the stored candidate key: the UEI when known, else the registrable domain, else the normalized name.

    A UEI key keeps two award recipients with look-alike names (or one shared web result) from colliding
    on the listing's unique dedupe key.
    """

    if supplier_uei:
        return f"uei:{supplier_uei.strip().upper()}"
    return registrable_domain(website_url) or normalize_business_name(business_name) or business_name.strip().casefold()


def _phone_digits(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = "".join(character for character in phone if character.isdigit())
    # A leading US country code is the same number written two ways.
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits if len(digits) >= _MIN_PHONE_DIGITS else None
