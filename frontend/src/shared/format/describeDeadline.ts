/* Describes a listing's challenge deadline and whether offers are still accepted.
   Display only: the backend enforces the deadline and rejects late offers regardless of what this shows. */
import { formatTimestamp, parseApiTimestamp } from './formatTimestamp';

export interface DeadlineDescription {
  isClosed: boolean;
  text: string;
}

/** Return open/closed state and a sentence for a deadline, or "no deadline" when none is set. */
export function describeDeadline(deadline: string | null, now: Date = new Date()): DeadlineDescription {
  if (!deadline) {
    return { isClosed: false, text: 'Open for offers, no deadline set' };
  }
  const isClosed = parseApiTimestamp(deadline).getTime() <= now.getTime();
  return isClosed
    ? { isClosed, text: `Closed to new offers since ${formatTimestamp(deadline)}` }
    : { isClosed, text: `Open for offers until ${formatTimestamp(deadline)}` };
}
