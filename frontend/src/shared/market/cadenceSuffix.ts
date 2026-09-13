/* The short period after a price, as a market app writes it: "$2,400 /mo". Words only; it never converts an amount
   between periods (normalizing prices is the backend's job). Unknown cadences are spelled out rather than guessed. */
const SUFFIXES: Record<string, string> = {
  weekly: '/wk',
  biweekly: '/2 wk',
  monthly: '/mo',
  bimonthly: '/2 mo',
  quarterly: '/qtr',
  annual: '/yr',
  annually: '/yr',
  yearly: '/yr',
};

/** Return the short period suffix for a billing cadence, e.g. "monthly" -> "/mo". */
export function cadenceSuffix(cadence: string | null): string {
  if (!cadence) {
    return '';
  }
  return SUFFIXES[cadence] ?? `/ ${cadence}`;
}
