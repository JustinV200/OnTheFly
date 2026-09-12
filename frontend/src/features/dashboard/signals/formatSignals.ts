/* Turns spend-signal values into display strings.
   Display only: amounts are never recomputed here, and percentages come from backend basis points. */
import type { NotAnalyzedTransaction } from './types';

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

/** Count rows the circuits skipped by what kept each out, e.g. "2 void, 1 pending, 1 credit". Assumes a non-empty list. */
export function formatNotAnalyzedSummary(transactions: NotAnalyzedTransaction[]): string {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    // A credit is left out for being a credit whatever its status, so name it that way.
    const label = transaction.direction === 'credit' ? 'credit' : transaction.status;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => `${count} ${label}`).join(', ');
}
