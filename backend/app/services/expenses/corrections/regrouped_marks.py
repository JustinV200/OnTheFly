"""Carries the owner's not-publishable mark along with charges that a re-sync regroups under another vendor key.
It reads keys and marks as stored before the regroup; it never clears a mark and never copies vendor or category corrections.
"""

from collections.abc import Iterable
from dataclasses import dataclass

from app.models.service_expense import ServiceExpense
from app.models.transaction import Transaction


@dataclass(frozen=True)
class RegroupedMarks:
    """The key each transaction was grouped under before this sync, and which of those keys held a marked row."""

    previous_keys: dict[str, str | None]
    marked_keys: frozenset[str]

    @classmethod
    def before_regroup(
        cls,
        transactions: Iterable[Transaction],
        stored_expenses: Iterable[ServiceExpense],
    ) -> "RegroupedMarks":
        """Snapshot one owner's transaction keys and stored marks.

        Call it before grouping rewrites each transaction's key and before sync sets any mark. Reading
        marks up front means whether a group inherits one never depends on the order sync visits groups.
        """

        return cls(
            previous_keys={transaction.id: transaction.normalized_vendor for transaction in transactions},
            marked_keys=frozenset(
                expense.normalized_vendor for expense in stored_expenses if expense.owner_marked_ineligible
            ),
        )

    def is_inherited_by(self, vendor_key: str, vendor_transactions: list[Transaction]) -> bool:
        """Return True when any of this group's charges was grouped under a different row the owner had marked.

        A vendor rename or an alias merge regroups charges under another key: into a new row, or into
        one that already exists (a rename onto another expense's name, or a merged alias). Either way
        one marked source row marks the whole group, because a less publishable choice is never dropped
        by a regroup; the owner can clear the mark on the combined expense. A never-synced Stripe charge
        has no stored key and carries nothing. Vendor and category corrections are not carried: the
        correction rules that caused the regroup already apply them to every charge, and copying a stale
        row value in place of what the charges now show could lift a hard exclusion.
        """

        source_keys = {self.previous_keys.get(transaction.id) for transaction in vendor_transactions}
        return any(key != vendor_key and key in self.marked_keys for key in source_keys if key is not None)
