/* The summary card's one-line coverage count, e.g. "5 of 5 answered · 4 of 4 required included". It counts the bidder's
   own answers only; it scores nothing and never claims the offer matches (the server scores it). */
import type { CoverageRow } from './listCoverageRows';

/** Return the count line for the rows listCoverageRows built. The required part is left out when nothing is required. */
export function describeCoverageCounts(rows: CoverageRow[]): string {
  const answeredCount = rows.filter((row) => row.answer !== 'not_stated').length;
  const requiredRows = rows.filter((row) => row.isRequired);
  const requiredIncludedCount = requiredRows.filter((row) => row.answer === 'covered').length;

  const answered = `${answeredCount} of ${rows.length} answered`;
  return requiredRows.length > 0 ? `${answered} · ${requiredIncludedCount} of ${requiredRows.length} required included` : answered;
}
