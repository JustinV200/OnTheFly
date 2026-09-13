"""Segments a recurring vendor's charges into price levels with the Compound Eye detector.
It finds confirmed price changes, one-off charges, an unconfirmed latest jump, and an earlier price
that was never established; it never guesses between them.
"""

from datetime import datetime
from enum import StrEnum
import math

from pydantic import BaseModel

from app.models.transaction import Transaction
from app.services.expenses.signals.median import change_basis_points, median_minor
from app.services.flybrain import ContrastAdaptation, SampleResponse

# Cadences detect_recurrence reports for a regular payment pattern. Irregular spend
# (office supplies) has no "price level" to find, so it is not segmented.
RECURRING_CADENCES = frozenset({"weekly", "biweekly", "monthly", "bimonthly", "quarterly"})

# Same minimum as detect_recurrence: fewer than three charges can't establish a level.
MIN_CHARGES = 3
# A price level must be held by at least two charges, and a strict majority of charges
# must sit in some level. Otherwise amounts vary too much for a "current price" to exist
# (office supplies bought on a schedule), and taking the first charge as the price would
# be worse than the plain average. At exactly half, which amount counts as "the price"
# depends only on which one came first.
MIN_CURRENT_LEVEL_CHARGES = 2
MIN_SHARE_IN_LEVELS = 0.5

# Charges the detector kept out of every level: one-offs, an unconfirmed trailing jump, and
# opening charges whose amount no charge repeated before the price moved.
OFF_LEVEL_RESPONSES = frozenset({SampleResponse.transient, SampleResponse.pending, SampleResponse.unconfirmed})

# The off-level charges the two stability guards in analyze_price_levels hold against a price:
# one-offs and an unconfirmed trailing jump. Unestablished opening charges are left out on
# purpose. A history that opens with a prorated month or a setup fee says nothing about
# whether the charges after it hold a price, so the opening neither lowers the share of
# charges at a price nor forms a recurring second price. Counting it would drop such a series
# to the plain average, which averages that partial charge into the baseline. The opening
# still stays out of every level and out of the baseline through OFF_LEVEL_RESPONSES.
STABILITY_GUARD_OFF_LEVEL_RESPONSES = frozenset({SampleResponse.transient, SampleResponse.pending})

# 5% contrast: a smaller move is billing noise absorbed into the level, a larger one
# is a response. Tuning showed the Mushroom Body amount channel also crosses its
# "unusual" threshold near 5%, so the two signals agree on what counts as different.
# One confirming charge makes a step; the decision waits exactly one billing period.
PRICE_LEVEL_DETECTOR = ContrastAdaptation(contrast_threshold=0.05, adaptation_rate=0.25, confirmations=1)


class NotAssessedReason(StrEnum):
    """Why price levels were not computed. Surfaced to the UI instead of an empty result."""

    cadence_not_recurring = "cadence_not_recurring"
    too_few_charges = "too_few_charges"
    mixed_currency = "mixed_currency"
    amounts_too_variable = "amounts_too_variable"
    # Set by the spend-signals report, never by analyze_price_levels: every stored row in
    # a Stripe group is pending, void, or a credit, so there is no charge to segment.
    no_posted_charges = "no_posted_charges"


class PriceLevelShift(BaseModel):
    """A confirmed change from one price level to the next."""

    transaction_id: str
    changed_at: datetime
    previous_amount_minor: int
    new_amount_minor: int
    change_basis_points: int


class PendingPriceChange(BaseModel):
    """The latest charge(s) moved away from the level, but nothing after them confirms it yet."""

    transaction_ids: list[str]
    first_seen_at: datetime
    latest_amount_minor: int
    level_amount_minor: int
    change_basis_points: int


class UnconfirmedEarlierPrice(BaseModel):
    """The price moved away from the first charge(s) before enough charges repeated their amount.

    Not a confirmed change, which needs an established price to change from, and not a
    one-off, since a real price that changed after one period looks the same. Reported
    as an earlier price that was never established and left out of the baseline.
    """

    transaction_ids: list[str]
    first_seen_at: datetime
    # Median of those charges; with one confirmation it is the single opening charge.
    amount_minor: int


class PriceLevelAnalysis(BaseModel):
    """The Compound Eye's reading of one vendor's charge history."""

    is_assessed: bool
    not_assessed_reason: NotAssessedReason | None
    currency: str | None
    current_level_amount_minor: int | None
    current_level_started_at: datetime | None
    current_level_transaction_ids: list[str]
    one_off_transaction_ids: list[str]
    shifts: list[PriceLevelShift]
    pending_change: PendingPriceChange | None
    unconfirmed_earlier_price: UnconfirmedEarlierPrice | None


def is_price_level_charge(transaction: Transaction) -> bool:
    """Return True for a row the Compound Eye reads: a debit with a positive amount.

    Refunds and zero rows set no price. The brain stimulus uses this too, so it replays
    only the amounts the detector actually read.
    """

    return transaction.direction == "debit" and transaction.amount_minor > 0


def analyze_price_levels(transactions: list[Transaction], cadence: str) -> PriceLevelAnalysis:
    """Find price levels in a recurring vendor's debit charges.

    Assumes the transactions are one vendor group. Credits (refunds) are not charges
    and are left out of the levels. Every amount reported is an integer median of
    real charges, never a value reconstructed from the detector's log-space state.
    Opening charges whose amount no charge repeated before the price moved come back as
    unconfirmed_earlier_price, never as a shift or a one-off. Returns not assessed
    (amounts_too_variable) when the one-offs and a pending jump leave no strict majority
    of charges at a price, or when those charges recur at one amount, so the baseline
    falls back to the labelled plain average. An unestablished opening counts against
    neither check.
    """

    charges = sorted(
        (transaction for transaction in transactions if is_price_level_charge(transaction)),
        key=lambda transaction: (transaction.posted_at, transaction.id or ""),
    )
    if cadence not in RECURRING_CADENCES:
        return not_assessed_price_levels(NotAssessedReason.cadence_not_recurring)
    if len(charges) < MIN_CHARGES:
        return not_assessed_price_levels(NotAssessedReason.too_few_charges)
    currencies = {charge.currency for charge in charges}
    if len(currencies) != 1:
        return not_assessed_price_levels(NotAssessedReason.mixed_currency)

    trace = PRICE_LEVEL_DETECTOR.run([float(charge.amount_minor) for charge in charges])
    level_starts = [0] + [shift.index for shift in trace.shifts]
    current_members = _level_members(trace.responses, level_starts, len(level_starts) - 1)
    # Unestablished opening charges are not held against a stable price here; see
    # STABILITY_GUARD_OFF_LEVEL_RESPONSES. They count with the charges at a price for the share.
    off_level_amounts = [
        charges[index].amount_minor
        for index, response in enumerate(trace.responses)
        if response in STABILITY_GUARD_OFF_LEVEL_RESPONSES
    ]
    in_level_count = len(charges) - len(off_level_amounts)
    # The detector confirms a level only when the very next charge holds it, so an amount
    # that keeps coming back every other period (500, 700, 500, 700) is marked a one-off
    # each time. Off-level charges that recur at one amount are a second price, not
    # one-offs: calling them one-offs would drop real spend from the baseline.
    if (
        len(current_members) < MIN_CURRENT_LEVEL_CHARGES
        or in_level_count / len(charges) <= MIN_SHARE_IN_LEVELS
        or _largest_similar_amount_group(off_level_amounts) >= MIN_CURRENT_LEVEL_CHARGES
    ):
        return not_assessed_price_levels(NotAssessedReason.amounts_too_variable)

    shifts: list[PriceLevelShift] = []
    for level_number, shift in enumerate(trace.shifts):
        previous_amount = median_minor(_level_amounts(charges, trace.responses, level_starts, level_number))
        new_amount = median_minor(_level_amounts(charges, trace.responses, level_starts, level_number + 1))
        shifts.append(
            PriceLevelShift(
                transaction_id=charges[shift.index].id,
                changed_at=charges[shift.index].posted_at,
                previous_amount_minor=previous_amount,
                new_amount_minor=new_amount,
                change_basis_points=change_basis_points(previous_amount, new_amount),
            )
        )

    current_amount = median_minor([charges[index].amount_minor for index in current_members])
    return PriceLevelAnalysis(
        is_assessed=True,
        not_assessed_reason=None,
        currency=charges[0].currency,
        current_level_amount_minor=current_amount,
        current_level_started_at=charges[trace.current_level_start].posted_at,
        current_level_transaction_ids=[charges[index].id for index in current_members],
        one_off_transaction_ids=[
            charges[index].id
            for index, response in enumerate(trace.responses)
            if response is SampleResponse.transient
        ],
        shifts=shifts,
        pending_change=_pending_change(charges, trace.responses, current_amount),
        unconfirmed_earlier_price=_unconfirmed_earlier_price(charges, trace.responses),
    )


def _level_members(
    responses: tuple[SampleResponse, ...],
    level_starts: list[int],
    level_number: int,
) -> list[int]:
    # A level runs from its start to the next level's start. One-offs, an unconfirmed
    # trailing jump, and unestablished opening charges sit inside that span but are not
    # charges at this price.
    start = level_starts[level_number]
    end = level_starts[level_number + 1] if level_number + 1 < len(level_starts) else len(responses)
    return [index for index in range(start, end) if responses[index] not in OFF_LEVEL_RESPONSES]


def _largest_similar_amount_group(amounts: list[int]) -> int:
    # Size of the largest set of amounts all within the detector's contrast threshold of
    # each other, measured in log space exactly as the detector compares charges. Once
    # sorted, a window whose first and last amounts are within the threshold is such a
    # set, so two pointers find the largest one. Amounts are positive charges.
    threshold = math.log1p(PRICE_LEVEL_DETECTOR.contrast_threshold)
    log_amounts = sorted(math.log(amount) for amount in amounts)
    largest = 0
    end = 0
    for start, lowest in enumerate(log_amounts):
        while end < len(log_amounts) and log_amounts[end] - lowest < threshold:
            end += 1
        largest = max(largest, end - start)
    return largest


def _level_amounts(
    charges: list[Transaction],
    responses: tuple[SampleResponse, ...],
    level_starts: list[int],
    level_number: int,
) -> list[int]:
    return [charges[index].amount_minor for index in _level_members(responses, level_starts, level_number)]


def _unconfirmed_earlier_price(
    charges: list[Transaction],
    responses: tuple[SampleResponse, ...],
) -> UnconfirmedEarlierPrice | None:
    # No change basis points: a percentage beside it would read as a price change.
    unconfirmed_indices = [index for index, response in enumerate(responses) if response is SampleResponse.unconfirmed]
    if not unconfirmed_indices:
        return None
    return UnconfirmedEarlierPrice(
        transaction_ids=[charges[index].id for index in unconfirmed_indices],
        first_seen_at=charges[unconfirmed_indices[0]].posted_at,
        amount_minor=median_minor([charges[index].amount_minor for index in unconfirmed_indices]),
    )


def _pending_change(
    charges: list[Transaction],
    responses: tuple[SampleResponse, ...],
    current_amount: int,
) -> PendingPriceChange | None:
    pending_indices = [index for index, response in enumerate(responses) if response is SampleResponse.pending]
    if not pending_indices:
        return None
    latest = charges[pending_indices[-1]]
    return PendingPriceChange(
        transaction_ids=[charges[index].id for index in pending_indices],
        first_seen_at=charges[pending_indices[0]].posted_at,
        latest_amount_minor=latest.amount_minor,
        level_amount_minor=current_amount,
        change_basis_points=change_basis_points(current_amount, latest.amount_minor),
    )


def not_assessed_price_levels(reason: NotAssessedReason) -> PriceLevelAnalysis:
    """Build the analysis for a reading that could not run: no levels, no shifts, the reason stated."""

    return PriceLevelAnalysis(
        is_assessed=False,
        not_assessed_reason=reason,
        currency=None,
        current_level_amount_minor=None,
        current_level_started_at=None,
        current_level_transaction_ids=[],
        one_off_transaction_ids=[],
        shifts=[],
        pending_change=None,
        unconfirmed_earlier_price=None,
    )
