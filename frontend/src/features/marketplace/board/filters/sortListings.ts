/* The market board's sort orders. There is deliberately no price sort: listings are billed on different cadences, and
   the frontend never converts a price between periods (CLAUDE.md, "Money and math"). */
import { parseApiTimestamp } from '../../../../shared/format/formatTimestamp';
import type { FilterChip } from '../../../../shared/ui';
import type { MarketplaceListing } from '../../types';

export type BoardSort = 'offers' | 'closing' | 'newest';

export const SORT_CHIPS: FilterChip<BoardSort>[] = [
  { value: 'offers', label: 'Most offers' },
  { value: 'closing', label: 'Closing soon' },
  { value: 'newest', label: 'Newest' },
];

/** Read a sort from a URL value; anything unrecognised falls back to "Most offers", the board's default. */
export function parseBoardSort(value: string | null): BoardSort {
  return SORT_CHIPS.some((chip) => chip.value === value) ? (value as BoardSort) : 'offers';
}

/** Return a sorted copy. Ties keep the feed's order (newest first), since Array.prototype.sort is stable. */
export function sortListings(listings: MarketplaceListing[], sort: BoardSort, now: Date = new Date()): MarketplaceListing[] {
  const sorted = [...listings];
  if (sort === 'offers') {
    return sorted.sort((a, b) => b.challenge_count - a.challenge_count);
  }
  if (sort === 'newest') {
    return sorted.sort((a, b) => compareNumbers(timeOr(b.listing.published_at, -Infinity), timeOr(a.listing.published_at, -Infinity)));
  }
  return sorted.sort((a, b) => {
    const groupDifference = closingGroup(a, now) - closingGroup(b, now);
    if (groupDifference !== 0) {
      return groupDifference;
    }
    return compareNumbers(timeOr(a.listing.challenge_deadline, Infinity), timeOr(b.listing.challenge_deadline, Infinity));
  });
}

// Subtraction would give NaN for two equal infinities (two listings without a deadline); equal values must tie.
function compareNumbers(a: number, b: number): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

// 0: open with a deadline (soonest first), 1: no deadline or an unreadable one, 2: already closed.
function closingGroup(item: MarketplaceListing, now: Date): number {
  const deadline = timeOr(item.listing.challenge_deadline, Number.NaN);
  if (Number.isNaN(deadline)) {
    return 1;
  }
  return deadline <= now.getTime() ? 2 : 0;
}

// Missing or unparseable timestamps sort as the given fallback instead of poisoning the comparison with NaN.
function timeOr(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const time = parseApiTimestamp(value).getTime();
  return Number.isNaN(time) ? fallback : time;
}
