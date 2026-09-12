"""Deterministic hard-exclusion classifier: payroll, taxes, and transfers are never eligible spend.
Import (per transaction) and eligibility (per vendor group) both call it, so the two rule sets cannot drift.
It reads descriptor text only. Direction plays no part: money moved to savings is a debit like any vendor payment.
"""

import re
from typing import Literal

SpendExclusionReason = Literal["payroll", "tax", "transfer"]

# Payroll processors whose descriptors often omit the word "payroll". Substring matches, because
# bank descriptors glue words together ("GUSTOPAYROLL"). Extend this list rather than adding
# inline conditionals.
_PAYROLL_SIGNALS: tuple[str, ...] = (
    "payroll",
    "gusto",
    "adp",
    "rippling",
    "paychex",
    "bamboohr",
    "justworks",
)

# Tax words and tax-agency payees, as whole words so "Syntaxco", "Taxi Detailing", and
# "First Choice" stay eligible. "taxpymt" is the one substring: the IRS EFTPS descriptor glues it
# on ("USATAXPYMT"). Agency names containing the word tax ("Franchise Tax Board") are already
# caught by the first pattern.
_TAX_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern)
    for pattern in (
        r"\btax(es|ation)?\b",
        r"taxpymt",
        r"\birs\b",
        r"\beftps\b",
        r"\binternal revenue service\b",
        r"\bdep(t|artment) of revenue\b",
    )
)

# Transfer phrases in either direction. A bare "transfer" is not enough, since "Transfer Pro
# Cleaning" is a vendor: the phrase has to name the movement itself (see CLAUDE.md, "Money and math").
_TRANSFER_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern)
    for pattern in (
        r"\b(online|wire|ach|internal|book|bank|funds?)\s+transfers?\b",
        r"\btransfers?\s+(to|from)\b",
        r"\bx(fer|fr)\b",
    )
)

_NON_ALPHANUMERIC_RE = re.compile(r"[^0-9a-z]+")


def classify_spend_exclusion(*texts: str | None) -> SpendExclusionReason | None:
    """Return the hard-exclusion reason any of the given texts shows, or None when none does.

    Pass every descriptor field available (raw description, vendor name, category, memo);
    None and empty entries are skipped. Checks run payroll, then tax, then transfer, so a
    payroll-tax remittance reads as payroll. None only means no exclusion signal was found;
    it does not confirm the spend is a service.
    """

    haystack = _searchable_text(texts)
    if any(signal in haystack for signal in _PAYROLL_SIGNALS):
        return "payroll"
    if any(pattern.search(haystack) for pattern in _TAX_PATTERNS):
        return "tax"
    if any(pattern.search(haystack) for pattern in _TRANSFER_PATTERNS):
        return "transfer"
    return None


def _searchable_text(texts: tuple[str | None, ...]) -> str:
    # Punctuation and underscores become single spaces, so "IRS*USATAXPYMT", a "sales_tax"
    # category, and "ONLINE-TRANSFER" all meet the word boundaries above.
    joined = " ".join(text for text in texts if text)
    return _NON_ALPHANUMERIC_RE.sub(" ", joined.casefold()).strip()
