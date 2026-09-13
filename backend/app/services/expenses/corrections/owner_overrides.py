"""Holds the owner's per-expense overrides that sync must honour whenever it recomputes eligibility.
It only reads them off stored rows; it never writes a row or decides eligibility itself.
"""

from dataclasses import dataclass

from app.models.service_expense import ServiceExpense


@dataclass(frozen=True)
class OwnerOverrides:
    """The vendor, category, and not-publishable mark an owner set on one expense.

    A None correction means the owner hasn't corrected that field, so what the charges show applies.
    """

    corrected_vendor: str | None = None
    corrected_category: str | None = None
    marked_ineligible: bool = False

    @classmethod
    def of(cls, expense: ServiceExpense) -> "OwnerOverrides":
        """Return the overrides stored on one expense row."""

        return cls(
            corrected_vendor=expense.owner_corrected_vendor,
            corrected_category=expense.owner_corrected_category,
            marked_ineligible=expense.owner_marked_ineligible,
        )
