"""Retry timing for transient invitation send failures: backoff that grows, and a cap (roadmap 08, step 7)."""

from datetime import timedelta

# Attempts per invitation, including the first. Past this a transient failure becomes a visible failed state.
MAX_ATTEMPTS = 3
# Delay before the next attempt, indexed by attempts already made (1st failure waits 30s, 2nd 120s).
RETRY_DELAYS: tuple[timedelta, ...] = (timedelta(seconds=30), timedelta(seconds=120), timedelta(seconds=600))


def retry_delay(attempts_made: int) -> timedelta:
    """Return how long to wait after the given number of attempts; later attempts reuse the longest delay."""

    index = min(max(attempts_made, 1), len(RETRY_DELAYS)) - 1
    return RETRY_DELAYS[index]
