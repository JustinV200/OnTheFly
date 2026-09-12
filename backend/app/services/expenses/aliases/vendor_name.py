"""Reduces a vendor group name to its distinguishing words and encodes it for FlyHash.
It only prepares names for comparison; deciding a pair is worth suggesting happens in suggest.py.
"""

from app.services.flybrain import SparseVector, cosine_similarity, encode_trigrams, text_words

# Legal forms and generic suffixes that vary between a vendor's own descriptors
# ("Sparkle Clean" vs "Sparkle Cleaning Services LLC") without naming a different business.
GENERIC_SUFFIX_WORDS = frozenset(
    {"and", "co", "company", "corp", "corporation", "inc", "llc", "ltd", "service", "services", "svc", "svcs", "the"}
)

# A bare word this short ("abc", "bay") is too weak to anchor a contained-name match.
MIN_CONTAINED_WORD_LENGTH = 4


def core_name_words(vendor_name: str) -> list[str]:
    """Return the vendor name's words without generic suffixes or digit-bearing tokens.

    Falls back to all alphabetic words when stripping would leave nothing, so a name
    like "The Company" still has something to compare.
    """

    words = [word for word in text_words(vendor_name) if not any(character.isdigit() for character in word)]
    core = [word for word in words if word not in GENERIC_SUFFIX_WORDS]
    return core or words


def vendor_name_receptors(vendor_name: str, receptor_count: int) -> SparseVector:
    """Encode a vendor's core name as character-trigram receptor activations."""

    return encode_trigrams(core_name_words(vendor_name), channel="vendor_name", receptor_count=receptor_count)


def brand_word_similarity(left_name: str, right_name: str, receptor_count: int) -> float:
    """Return trigram cosine between the first core word of each name.

    Vendors keep their brand word first across descriptors, and it is what separates
    "Sparkle Cleaning" from "Bright Cleaning" when the generic word matches.
    """

    left_words = core_name_words(left_name)
    right_words = core_name_words(right_name)
    if not left_words or not right_words:
        return 0.0
    return cosine_similarity(
        encode_trigrams(left_words[:1], channel="brand_word", receptor_count=receptor_count),
        encode_trigrams(right_words[:1], channel="brand_word", receptor_count=receptor_count),
    )


def is_contained_name(left_name: str, right_name: str) -> bool:
    """Return True when one core name's words all appear in the other ("Orkin" in "Orkin Pest Control").

    The shorter name must include a word of at least MIN_CONTAINED_WORD_LENGTH letters.
    """

    left_words = set(core_name_words(left_name))
    right_words = set(core_name_words(right_name))
    if not left_words or not right_words:
        return False
    shorter, longer = (left_words, right_words) if len(left_words) <= len(right_words) else (right_words, left_words)
    return shorter <= longer and any(len(word) >= MIN_CONTAINED_WORD_LENGTH for word in shorter)


def shared_core_words(left_name: str, right_name: str) -> list[str]:
    """Return core words present in both names, sorted, for display as evidence."""

    return sorted(set(core_name_words(left_name)) & set(core_name_words(right_name)))
