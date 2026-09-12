"""Normalizes noisy processor descriptions into stable vendor names.
It also persists owner-specific correction rules for future imports.
"""

import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vendor_correction import VendorCorrection


PREFIX_RE = re.compile(r"^(sq\s*\*|tst\s*\*|stripe:)\s*", re.IGNORECASE)
PHONE_RE = re.compile(r"\b\d{7,}\b")
STORE_RE = re.compile(r"\s+#\d+\b")
WHITESPACE_RE = re.compile(r"\s+")



def normalize_vendor_description(raw: str) -> str:
    """Strip common processor noise and return a stable vendor display name."""

    cleaned = PREFIX_RE.sub("", raw).strip()
    cleaned = PHONE_RE.sub("", cleaned)
    cleaned = STORE_RE.sub("", cleaned)
    cleaned = cleaned.replace(" SF", " ").replace(" CA", " ")
    cleaned = WHITESPACE_RE.sub(" ", cleaned).strip(" -*")
    return cleaned.title()


class VendorCorrectionStore:
    """Persists and applies owner-specific vendor/category correction rules.

    One instance caches each owner's rules for the duration of a sync, so resolving
    every transaction doesn't re-query the table. upsert() clears that cache.
    """

    def __init__(self) -> None:
        self._rules_by_owner: dict[str, list[tuple[re.Pattern[str], VendorCorrection]]] = {}

    def resolve(
        self,
        owner_account_id: str,
        raw_description: str,
        fallback_vendor: str,
        fallback_category: str | None,
        db: Session,
    ) -> tuple[str, str | None]:
        """Return corrected vendor/category values when a rule matches the raw text.

        A rule matches on whole words, so "orkin" never claims "Porkington BBQ". When
        several rules match, the longest (most specific) pattern wins, so a merge rule
        for one exact descriptor outranks a broad rename rule regardless of insert order.
        """

        lowered = raw_description.casefold()
        for pattern, correction in self._rules_for(owner_account_id, db):
            if not pattern.search(lowered):
                continue
            return (
                correction.corrected_vendor or fallback_vendor,
                correction.corrected_category or fallback_category,
            )
        return fallback_vendor, fallback_category

    def upsert(
        self,
        owner_account_id: str,
        raw_description_pattern: str,
        corrected_vendor: str | None,
        corrected_category: str | None,
        db: Session,
    ) -> VendorCorrection:
        """Create or update one correction rule for future imports; patterns compare case-insensitively."""

        self._rules_by_owner.pop(owner_account_id, None)
        existing = db.scalars(
            select(VendorCorrection).where(VendorCorrection.owner_account_id == owner_account_id)
        ).all()
        folded = raw_description_pattern.casefold()
        correction = next(
            (rule for rule in existing if rule.raw_description_pattern.casefold() == folded),
            None,
        )
        if correction is None:
            # A random ID, not one derived from the pattern: patterns can be full
            # 255-character descriptors, which overflow the 120-character key column.
            correction = VendorCorrection(
                id=str(uuid.uuid4()),
                owner_account_id=owner_account_id,
                raw_description_pattern=raw_description_pattern,
                corrected_vendor=corrected_vendor,
                corrected_category=corrected_category,
            )
            db.add(correction)
            # Sessions here don't autoflush; flushing lets a second upsert of the same
            # pattern in this session find this row instead of inserting a duplicate.
            db.flush()
            return correction

        correction.corrected_vendor = corrected_vendor
        correction.corrected_category = corrected_category
        return correction

    def _rules_for(
        self,
        owner_account_id: str,
        db: Session,
    ) -> list[tuple[re.Pattern[str], VendorCorrection]]:
        cached = self._rules_by_owner.get(owner_account_id)
        if cached is not None:
            return cached
        corrections = db.scalars(
            select(VendorCorrection).where(VendorCorrection.owner_account_id == owner_account_id)
        ).all()
        ordered = sorted(
            corrections,
            key=lambda correction: (-len(correction.raw_description_pattern), correction.raw_description_pattern.casefold()),
        )
        rules = [(_whole_word_pattern(correction.raw_description_pattern), correction) for correction in ordered]
        self._rules_by_owner[owner_account_id] = rules
        return rules


def _whole_word_pattern(raw_pattern: str) -> re.Pattern[str]:
    # Boundaries are "not a letter or digit" rather than \b, so patterns that start or
    # end with punctuation ("sq *sparkle") still anchor correctly.
    return re.compile(rf"(?<![0-9a-z]){re.escape(raw_pattern.casefold())}(?![0-9a-z])")
