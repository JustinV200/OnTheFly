"""Normalizes noisy processor descriptions into stable vendor names.
It also persists owner-specific correction rules for future imports.
"""

import re

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
    """Persists and applies owner-specific vendor/category correction rules."""

    def resolve(
        self,
        owner_account_id: str,
        raw_description: str,
        fallback_vendor: str,
        fallback_category: str | None,
        db: Session,
    ) -> tuple[str, str | None]:
        """Return corrected vendor/category values when a rule matches the raw text."""

        corrections = db.scalars(
            select(VendorCorrection).where(VendorCorrection.owner_account_id == owner_account_id)
        ).all()
        lowered = raw_description.casefold()
        for correction in corrections:
            if correction.raw_description_pattern.casefold() not in lowered:
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
        """Create or update one correction rule for future imports."""

        correction_id = f"{owner_account_id}:{raw_description_pattern.casefold()}"
        correction = db.get(VendorCorrection, correction_id)
        if correction is None:
            correction = VendorCorrection(
                id=correction_id,
                owner_account_id=owner_account_id,
                raw_description_pattern=raw_description_pattern,
                corrected_vendor=corrected_vendor,
                corrected_category=corrected_category,
            )
            db.add(correction)
            return correction

        correction.corrected_vendor = corrected_vendor
        correction.corrected_category = corrected_category
        return correction
