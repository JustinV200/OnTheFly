/* Turns spend-signal values into display strings.
   Display only: amounts are never recomputed here, and percentages come from backend basis points. */

/** Format basis points as a signed percentage, e.g. 1081 -> "+10.81%". */
export function formatBasisPoints(basisPoints: number): string {
  const sign = basisPoints > 0 ? '+' : basisPoints < 0 ? '−' : '';
  return `${sign}${(Math.abs(basisPoints) / 100).toFixed(2)}%`;
}

/** Format an ISO timestamp as a short calendar date in UTC, matching how charges post. */
export function formatPostedDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });
}
