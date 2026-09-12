"""Suggests pairs of an owner's vendor groups that are probably one vendor under two descriptors.
FlyHash finds candidate names; deterministic checks decide what is suggested; only the owner merges.
"""

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service_expense import ServiceExpense
from app.models.vendor_alias_dismissal import VendorAliasDismissal
from app.services.expenses.aliases.vendor_name import (
    brand_word_similarity,
    is_contained_name,
    shared_core_words,
    vendor_name_receptors,
)
from app.services.expenses.listing_references import listed_expense_ids
from app.services.expenses.vendor_group_key import base_vendor_name, is_currency_keyed
from app.services.flybrain import FlyHashIndex, MushroomBodyShape, build_flyhash

# Same shape the charge-description channel uses; tuning on vendor names showed tag
# overlap tracking exact trigram cosine at r = 0.98 with no related pair missed.
VENDOR_NAME_SHAPE = MushroomBodyShape(input_dim=1024, kenyon_cells=4000, fan_in=3, tag_size=200, seed=2017)

# Candidates below this exact name similarity are never considered, even if FlyHash
# returns them; it is deliberately loose because the checks below do the deciding.
CANDIDATE_FLOOR = 0.3
# "Sparkle Clean" vs "Sparkle Cleaning Services" scores 0.83; unrelated vendors
# sharing only a generic word ("Sparkle Cleaning" vs "Bright Cleaning") score ~0.55.
NAME_SIMILARITY_THRESHOLD = 0.6
BRAND_WORD_THRESHOLD = 0.7
CANDIDATES_PER_VENDOR = 5


class VendorGroupSummary(BaseModel):
    """The owner-visible facts about one side of a suggested pair."""

    expense_id: str
    vendor: str
    category: str | None
    charge_count: int
    amount_minor_per_period: int
    cadence: str


class VendorAliasSuggestion(BaseModel):
    """A proposed merge of alias into canonical, with the evidence behind it."""

    alias: VendorGroupSummary
    canonical: VendorGroupSummary
    currency: str
    name_similarity: float
    shared_words: list[str]


def suggest_vendor_aliases(owner_account_id: str, db: Session) -> list[VendorAliasSuggestion]:
    """Return merge suggestions for one owner's stored vendor groups, strongest first.

    Never suggests: groups with a hard exclusion or owner ineligibility, groups with
    different known categories or currencies, a currency-keyed Stripe group with another
    provider's group, a pair the owner dismissed, or folding away a group the listing
    flow already references. Each alias appears at most once. Names are compared without
    the Stripe " [CUR]" key suffix.
    """

    expenses = [
        expense
        for expense in db.scalars(
            select(ServiceExpense).where(ServiceExpense.owner_account_id == owner_account_id)
        ).all()
        if expense.is_eligible
    ]
    if len(expenses) < 2:
        return []

    by_id = {expense.id: expense for expense in expenses}
    listed = listed_expense_ids(list(by_id), db)
    dismissed = _dismissed_pairs(owner_account_id, db)
    index: FlyHashIndex[str] = FlyHashIndex(build_flyhash(VENDOR_NAME_SHAPE))
    for expense in expenses:
        index.add(expense.id, vendor_name_receptors(_comparable_name(expense), VENDOR_NAME_SHAPE.input_dim))

    best_by_alias: dict[str, VendorAliasSuggestion] = {}
    for expense in expenses:
        matches = index.query(
            vendor_name_receptors(_comparable_name(expense), VENDOR_NAME_SHAPE.input_dim),
            limit=CANDIDATES_PER_VENDOR,
            min_similarity=CANDIDATE_FLOOR,
            exclude={expense.id},
        )
        for match in matches:
            other = by_id[match.key]
            if not _is_plausible_pair(expense, other, match.similarity):
                continue
            roles = _assign_roles(expense, other, listed)
            if roles is None:
                continue
            alias, canonical = roles
            if frozenset({alias.normalized_vendor, canonical.normalized_vendor}) in dismissed:
                continue
            suggestion = _build_suggestion(alias, canonical, match.similarity)
            current = best_by_alias.get(alias.id)
            if current is None or suggestion.name_similarity > current.name_similarity:
                best_by_alias[alias.id] = suggestion

    return sorted(
        best_by_alias.values(),
        key=lambda suggestion: (-suggestion.name_similarity, suggestion.alias.vendor),
    )


def _is_plausible_pair(left: ServiceExpense, right: ServiceExpense, name_similarity: float) -> bool:
    if left.currency != right.currency:
        return False
    # A Stripe group's key carries its currency and another provider's doesn't, so correction
    # rules can never fold one into the other; suggesting the pair would only offer a refused merge.
    if is_currency_keyed(left.normalized_vendor, left.currency) != is_currency_keyed(right.normalized_vendor, right.currency):
        return False
    left_category = left.owner_corrected_category or left.category
    right_category = right.owner_corrected_category or right.category
    if left_category and right_category and left_category != right_category:
        return False
    left_name = _comparable_name(left)
    right_name = _comparable_name(right)
    # The brand word must match, whichever name test passes. This is what stops two
    # different businesses in one trade from being suggested on the trade word alone.
    if brand_word_similarity(left_name, right_name, VENDOR_NAME_SHAPE.input_dim) < BRAND_WORD_THRESHOLD:
        return False
    return name_similarity >= NAME_SIMILARITY_THRESHOLD or is_contained_name(left_name, right_name)


def _assign_roles(
    left: ServiceExpense,
    right: ServiceExpense,
    listed: set[str],
) -> tuple[ServiceExpense, ServiceExpense] | None:
    # The group with more history absorbs the other; ties go to the older group, then ID,
    # so the same pair always gets the same roles.
    canonical, alias = sorted(
        (left, right),
        key=lambda expense: (-expense.period_count, expense.first_seen, expense.id),
    )
    if alias.id in listed and canonical.id in listed:
        return None
    if alias.id in listed:
        # A listed expense must survive, so it becomes the canonical side.
        alias, canonical = canonical, alias
    return alias, canonical


def _build_suggestion(alias: ServiceExpense, canonical: ServiceExpense, name_similarity: float) -> VendorAliasSuggestion:
    return VendorAliasSuggestion(
        alias=_summarize(alias),
        canonical=_summarize(canonical),
        currency=canonical.currency,
        name_similarity=round(name_similarity, 2),
        shared_words=shared_core_words(_comparable_name(alias), _comparable_name(canonical)),
    )


def _comparable_name(expense: ServiceExpense) -> str:
    # Stripe group keys end in " [USD]"; left in, "usd" is a core word every Stripe vendor
    # shares, which lifts unrelated same-brand pairs ("Metro Cleaning"/"Metro Parking") over the threshold.
    return base_vendor_name(expense.normalized_vendor, expense.currency)


def _summarize(expense: ServiceExpense) -> VendorGroupSummary:
    return VendorGroupSummary(
        expense_id=expense.id,
        vendor=expense.owner_corrected_vendor or expense.normalized_vendor,
        category=expense.owner_corrected_category or expense.category,
        charge_count=expense.period_count,
        amount_minor_per_period=expense.amount_minor_per_period,
        cadence=expense.cadence,
    )


def _dismissed_pairs(owner_account_id: str, db: Session) -> set[frozenset[str]]:
    # Unordered: dismissing A-into-B also silences B-into-A.
    rows = db.scalars(
        select(VendorAliasDismissal).where(VendorAliasDismissal.owner_account_id == owner_account_id)
    ).all()
    return {frozenset({row.alias_vendor, row.canonical_vendor}) for row in rows}
