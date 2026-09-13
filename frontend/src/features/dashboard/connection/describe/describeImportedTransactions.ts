/* Says how many transactions were imported and from where, e.g. "31 transactions (28 from fixture, 3 from Stripe sandbox)".
   Counts and labels come from the stored rows (backend connection/sources.py), never from the configured source. */
import type { ImportedSource } from '../types';
import { sourceLabel } from './sourceLabel';

/** Describe the imported transactions per source. A source with no live link is marked as no longer connected. */
export function describeImportedTransactions(transactionCount: number, sources: ImportedSource[]): string {
  const total = `${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`;
  const parts = sources.map((source) => {
    const origin = sourceLabel(source.provider, source.source_type);
    return { count: source.transaction_count, origin: source.is_connected ? origin : `${origin} (no longer connected)` };
  });

  if (parts.length === 1) {
    return `${total} from ${parts[0].origin}`;
  }
  return `${total} (${parts.map((part) => `${part.count} from ${part.origin}`).join(', ')})`;
}
