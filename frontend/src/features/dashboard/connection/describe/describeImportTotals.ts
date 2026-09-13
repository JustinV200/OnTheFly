/* One sentence of what this business has imported across every source, for the Data sources card:
   "28 transactions from Hackathon demo ledger, 1 excluded (payroll), posted Sep 5, 2025 to Sep 5, 2026."
   Every count, reason, and date comes from the stored rows the connection endpoint reports; nothing is recomputed here. */
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import type { ConnectionStatus } from '../types';
import { describeImportedTransactions } from './describeImportedTransactions';

/** Return the totals sentence, or null when nothing has been imported yet. */
export function describeImportTotals(connection: ConnectionStatus): string | null {
  if (connection.status !== 'imported') {
    return null;
  }
  const excluded = connection.excluded_count > 0
    ? `, ${connection.excluded_count} excluded${connection.excluded_reasons.length > 0 ? ` (${connection.excluded_reasons.join(', ')})` : ''}`
    : '';
  const posted = connection.first_posted_at && connection.last_posted_at
    ? `, posted ${formatTimestamp(connection.first_posted_at, { dateOnly: true })} to ${formatTimestamp(connection.last_posted_at, { dateOnly: true })}`
    : '';
  // The endpoint reports one last-import time across sources; a row can claim it only when it is the only source,
  // so with several sources the time is stated here instead.
  const lastImported = connection.sources.length > 1 && connection.last_imported_at
    ? ` Last import from any source ${formatTimestamp(connection.last_imported_at)}.`
    : '';
  const unlinked = connection.connections.length === 0 ? ' No financial account is connected now.' : '';
  return `${describeImportedTransactions(connection.transaction_count, connection.sources)}${excluded}${posted}.${lastImported}${unlinked}`;
}
