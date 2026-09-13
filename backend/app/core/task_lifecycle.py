"""Names a task's origin, lifecycle state, and the entry points a split can come from (roadmap 12).
Unknown stored values are never promoted: callers treat anything unparseable as the most restrictive state.
"""

from enum import StrEnum


class TaskOrigin(StrEnum):
    """How a task came to exist: re-bidding observed spend, new work, or a piece split off another task."""

    rebid = "rebid"
    new = "new"
    split = "split"


class TaskState(StrEnum):
    """The task lifecycle from CLAUDE.md: private → scope confirmed → public → closed → shortlisted → accepted."""

    private = "private"
    scope_confirmed = "scope_confirmed"
    public = "public"
    closed = "closed"
    shortlisted = "shortlisted"
    accepted = "accepted"


class SplitEntryPoint(StrEnum):
    """Where the owner started a split: a Ways to save card, the manual drawer, or Split everything (P1)."""

    suggested = "suggested"
    manual = "manual"
    split_everything = "split_everything"


class TaskRelationship(StrEnum):
    """The acting account's direct relationship to one task. Nothing else may read a task."""

    # Posted the task and still owns it: no offer has been accepted yet.
    poster_and_owner = "poster_and_owner"
    # Posted the task and accepted an offer, so it is the client of the bidder who now owns it.
    poster = "poster"
    # Won the task through an accepted offer; the poster is its client.
    owner = "owner"
