/* A market-style relative deadline ("Closes in 3 days", "Closes today", "Closed") for cards and tickets, with the
   absolute time kept for a tooltip. Display only: the backend enforces the deadline and rejects late offers. */
import { formatTimestamp, parseApiTimestamp } from '../format/formatTimestamp';

export interface ClosesIn {
  isClosed: boolean;
  // Short relative words for a meta row.
  label: string;
  // The absolute time, for a title attribute; null when there is no deadline.
  exact: string | null;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Describe a nullable API deadline relative to now. */
export function describeClosesIn(deadline: string | null, now: Date = new Date()): ClosesIn {
  if (!deadline) {
    return { isClosed: false, label: 'No deadline', exact: null };
  }
  const exact = formatTimestamp(deadline);
  const remaining = parseApiTimestamp(deadline).getTime() - now.getTime();
  if (Number.isNaN(remaining)) {
    // An unparseable deadline must not read as open; the raw value stays visible in the tooltip.
    return { isClosed: false, label: 'Deadline unreadable', exact };
  }
  if (remaining <= 0) {
    return { isClosed: true, label: 'Closed', exact };
  }
  if (remaining < HOUR_MS) {
    return { isClosed: false, label: 'Closes within the hour', exact };
  }
  if (remaining < DAY_MS) {
    const hours = Math.floor(remaining / HOUR_MS);
    return { isClosed: false, label: `Closes in ${hours} ${hours === 1 ? 'hour' : 'hours'}`, exact };
  }
  const days = Math.floor(remaining / DAY_MS);
  return { isClosed: false, label: `Closes in ${days} ${days === 1 ? 'day' : 'days'}`, exact };
}
