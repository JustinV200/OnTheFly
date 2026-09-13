/* "3 minutes ago" / "in 2 hours" for API timestamps, with formatTimestamp as the exact value for a tooltip
   (roadmap 11, "Copy and density pass": relative times, absolute on hover). Display only. */
import { parseApiTimestamp } from './formatTimestamp';

const RELATIVE = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** Return a relative description of an API timestamp against now, e.g. "5 minutes ago". */
export function formatRelativeTime(value: string, now: Date = new Date()): string {
  const date = parseApiTimestamp(value);
  if (Number.isNaN(date.getTime())) {
    // Visible raw value, never "Invalid Date".
    return value;
  }
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, unitSeconds] of UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return RELATIVE.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return 'just now';
}
