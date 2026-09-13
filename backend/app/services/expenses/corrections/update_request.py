"""Declares one owner correction to an expense as the corrections service receives it.
The API layer builds it from only the fields the request body actually contained.
"""

from pydantic import BaseModel, field_validator


class OwnerExpenseUpdate(BaseModel):
    """The vendor, category, and publishability fields one owner request sent; model_fields_set names them.

    An unsent field keeps its stored value. A sent null or blank vendor/category clears the row's
    correction. is_publishable false marks the expense not publishable, true clears that mark, and
    null leaves it unchanged.
    """

    owner_corrected_vendor: str | None = None
    owner_corrected_category: str | None = None
    is_publishable: bool | None = None

    @field_validator("owner_corrected_vendor", "owner_corrected_category")
    @classmethod
    def _blank_means_cleared(cls, value: str | None) -> str | None:
        # Every reader falls back past an empty string ("or"), so blank text is stored as the clear it acts as.
        if value is None:
            return None
        return value.strip() or None

    def is_sent(self, field_name: str) -> bool:
        """Return True when the request body contained this field, even as null."""

        return field_name in self.model_fields_set
