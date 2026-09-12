"""Scores each charge against the vendor's earlier charges with the Mushroom Body novelty filter.
It flags charges for owner review; it never changes baselines, eligibility, or visibility.
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel

from app.models.transaction import Transaction
from app.services.flybrain import (
    MushroomBodyShape,
    NoveltyFilter,
    build_flyhash,
    encode_log_magnitude,
    encode_trigrams,
    text_words,
)

# Charges before this many earlier charges are reported as "not enough history",
# never as typical. Two is the smallest history where "unlike earlier charges" means
# more than "unlike one other charge".
MIN_PRIOR_CHARGES = 2

# A charge is unusual on a channel when at least half of its Kenyon cells were never
# driven by an earlier charge. On the amount channel that is roughly a 5% difference
# (tuning: +1% scored ~0.2, +5% ~0.5, +10% ~0.8, a one-off at 40% of the usual ~1.0).
UNUSUAL_THRESHOLD = 0.5

# Familiarity halves over a year, so a price last seen long ago drifts back toward
# novel while a monthly bill seen last month stays familiar (novelty ~0.06).
MEMORY_HALF_LIFE_DAYS = 365.0

# 1024 hashed receptors, 4000 Kenyon cells, 3 inputs per cell, 5% tag. In tuning
# this shape kept tag overlap tightly correlated with exact similarity (r = 0.98).
CHARGE_SHAPE = MushroomBodyShape(input_dim=1024, kenyon_cells=4000, fan_in=3, tag_size=200, seed=20170)

# 2% receptor bands responding two bands either side: nearby amounts share receptors.
AMOUNT_STEP_RATIO = 1.02
AMOUNT_SPREAD = 2


class ChargeStatus(StrEnum):
    """The review state for one charge."""

    not_enough_history = "not_enough_history"
    # The vendor's charges have no stable pattern (every purchase differs), so "unlike
    # earlier charges" is true of all of them and would be noise, not a finding.
    no_stable_pattern = "no_stable_pattern"
    typical = "typical"
    unusual = "unusual"


class NoveltyReason(StrEnum):
    """Which channel made a charge unusual."""

    amount_unlike_earlier_charges = "amount_unlike_earlier_charges"
    description_unlike_earlier_charges = "description_unlike_earlier_charges"


class ChargeNovelty(BaseModel):
    """One charge's novelty reading, with the channel scores behind it."""

    transaction_id: str
    posted_at: datetime
    amount_minor: int
    currency: str
    direction: str
    status: ChargeStatus
    prior_charge_count: int
    amount_novelty: float | None
    description_novelty: float | None
    reasons: list[NoveltyReason]


def score_charge_novelty(transactions: list[Transaction], has_stable_pattern: bool) -> list[ChargeNovelty]:
    """Return a novelty reading per transaction, oldest first.

    Each charge is scored against only the charges before it, then learned. The result
    reads the way the history unfolded: a new price is unusual the first time it
    appears and familiar afterwards, while a one-off stays flagged.

    has_stable_pattern comes from the Compound Eye price-level analysis. Without one,
    scores are still reported but no charge is called typical or unusual.
    """

    flyhash = build_flyhash(CHARGE_SHAPE)
    amount_memory = NoveltyFilter(learning_rate=1.0, memory_half_life=MEMORY_HALF_LIFE_DAYS)
    description_memory = NoveltyFilter(learning_rate=1.0, memory_half_life=MEMORY_HALF_LIFE_DAYS)
    ordered = sorted(transactions, key=lambda transaction: (transaction.posted_at, transaction.id or ""))
    readings: list[ChargeNovelty] = []
    previous_posted_at: datetime | None = None

    for prior_count, transaction in enumerate(ordered):
        if previous_posted_at is not None:
            elapsed_days = max(0.0, (transaction.posted_at - previous_posted_at).total_seconds() / 86400)
            amount_memory.elapse(elapsed_days)
            description_memory.elapse(elapsed_days)
        previous_posted_at = transaction.posted_at

        amount_tag = flyhash.tag(_amount_receptors(transaction)) if transaction.amount_minor > 0 else frozenset()
        description_tag = flyhash.tag(_description_receptors(transaction))
        amount_novelty = amount_memory.novelty(amount_tag) if amount_tag else None
        description_novelty = description_memory.novelty(description_tag) if description_tag else None
        readings.append(
            _reading(transaction, prior_count, amount_novelty, description_novelty, has_stable_pattern)
        )

        # Learn every charge, flagged or not; the fly learns every odour it meets.
        if amount_tag:
            amount_memory.observe(amount_tag)
        if description_tag:
            description_memory.observe(description_tag)

    return readings


def _reading(
    transaction: Transaction,
    prior_count: int,
    amount_novelty: float | None,
    description_novelty: float | None,
    has_stable_pattern: bool,
) -> ChargeNovelty:
    reasons: list[NoveltyReason] = []
    if prior_count < MIN_PRIOR_CHARGES:
        status = ChargeStatus.not_enough_history
    elif not has_stable_pattern:
        status = ChargeStatus.no_stable_pattern
    else:
        if amount_novelty is not None and amount_novelty >= UNUSUAL_THRESHOLD:
            reasons.append(NoveltyReason.amount_unlike_earlier_charges)
        if description_novelty is not None and description_novelty >= UNUSUAL_THRESHOLD:
            reasons.append(NoveltyReason.description_unlike_earlier_charges)
        status = ChargeStatus.unusual if reasons else ChargeStatus.typical

    return ChargeNovelty(
        transaction_id=transaction.id,
        posted_at=transaction.posted_at,
        amount_minor=transaction.amount_minor,
        currency=transaction.currency,
        direction=transaction.direction,
        status=status,
        prior_charge_count=prior_count,
        amount_novelty=_rounded(amount_novelty),
        description_novelty=_rounded(description_novelty),
        reasons=reasons,
    )


def _amount_receptors(transaction: Transaction) -> dict[int, float]:
    # Currency and direction are part of the channel name, so a refund never reads as
    # familiar because a charge of the same size was seen, and USD never matches EUR.
    channel = f"amount:{transaction.direction}:{transaction.currency}"
    return encode_log_magnitude(
        float(transaction.amount_minor),
        channel=channel,
        receptor_count=CHARGE_SHAPE.input_dim,
        step_ratio=AMOUNT_STEP_RATIO,
        spread=AMOUNT_SPREAD,
    )


def _description_receptors(transaction: Transaction) -> dict[int, float]:
    # Words containing digits are dropped: invoice numbers, store numbers, and dates
    # change on every charge and would make each one look novel.
    text = f"{transaction.raw_description} {transaction.memo or ''}"
    words = [word for word in text_words(text) if not any(character.isdigit() for character in word)]
    return encode_trigrams(words, channel="description", receptor_count=CHARGE_SHAPE.input_dim)


def _rounded(score: float | None) -> float | None:
    # Two decimals is the precision the UI shows; more would imply false precision.
    return None if score is None else round(score, 2)
