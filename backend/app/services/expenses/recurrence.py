"""Detects payment cadence from a vendor's transaction history.
This module stays deterministic and never guesses with model output.
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.transaction import Transaction


class RecurrenceResult(BaseModel):
    """Summarizes cadence confidence and observation details for a transaction set."""

    cadence: str
    confidence: float
    interval_regularity: float
    amount_stability: float
    first_seen: datetime
    last_seen: datetime
    period_count: int



def detect_recurrence(transactions: list[Transaction]) -> RecurrenceResult:
    """Classify cadence from at least three transactions, else insufficient_data."""

    ordered = sorted(transactions, key=lambda transaction: transaction.posted_at)
    first_seen = ordered[0].posted_at
    last_seen = ordered[-1].posted_at
    period_count = len(ordered)

    if len(ordered) < 3:
        return RecurrenceResult(
            cadence="insufficient_data",
            confidence=0.0,
            interval_regularity=0.0,
            amount_stability=_amount_stability(ordered),
            first_seen=first_seen,
            last_seen=last_seen,
            period_count=period_count,
        )

    intervals = [
        (later.posted_at.date() - earlier.posted_at.date()).days
        for earlier, later in zip(ordered, ordered[1:])
    ]
    average_interval = sum(intervals) / len(intervals)
    interval_regularity = 1.0 - (max(intervals) - min(intervals)) / max(average_interval, 1)
    amount_stability = _amount_stability(ordered)
    cadence = _classify_cadence(average_interval)
    confidence = max(0.0, min(1.0, (interval_regularity + amount_stability) / 2))

    return RecurrenceResult(
        cadence=cadence,
        confidence=confidence,
        interval_regularity=max(0.0, interval_regularity),
        amount_stability=amount_stability,
        first_seen=first_seen,
        last_seen=last_seen,
        period_count=period_count,
    )


def _classify_cadence(average_interval: float) -> str:
    if average_interval <= 10:
        return "weekly"
    if average_interval <= 20:
        return "biweekly"
    if average_interval <= 40:
        return "monthly"
    # Every-two-months billing (~61 days) used to fall into "quarterly" and was
    # annualized x4 instead of x6, understating the yearly cost by a third.
    if average_interval <= 75:
        return "bimonthly"
    if average_interval <= 100:
        return "quarterly"
    return "irregular"


def _amount_stability(transactions: list[Transaction]) -> float:
    amounts = [transaction.amount_minor for transaction in transactions]
    baseline = max(max(amounts), 1)
    spread = max(amounts) - min(amounts)
    stability = 1.0 - (spread / baseline)
    return max(0.0, min(1.0, stability))
