/* Summarizes what was imported for this business and from where, beside the demo import's refresh control.
   Every count, reason, and date comes from the stored rows the connection endpoint reports; nothing is recomputed here. */
import type { ReactNode } from 'react';

import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { DataSourceSection } from '../../connections/sources/DataSourceSection';
import { describeConnections } from './describe/describeConnections';
import { describeImportedTransactions } from './describe/describeImportedTransactions';
import type { ConnectionStatus } from './types';

interface ImportedConnectionSummaryProps {
  connection: ConnectionStatus;
  // Null when no demo link can import here (e.g. a Stripe-only business).
  importButton: ReactNode;
  // Leading-space sentence pointing Stripe-linked businesses at the Stripe section, or ''.
  stripeNote: string;
  // The last import's outcome, shown under the summary.
  children?: ReactNode;
}

/** Render the imported-transactions section: counts and date range first, then when it ran and what is linked. */
export function ImportedConnectionSummary({ connection, importButton, stripeNote, children }: ImportedConnectionSummaryProps): JSX.Element {
  const excluded = connection.excluded_count > 0
    ? `, ${connection.excluded_count} excluded${connection.excluded_reasons.length > 0 ? ` (${connection.excluded_reasons.join(', ')})` : ''}`
    : '';
  const posted = connection.first_posted_at && connection.last_posted_at
    ? `, posted ${formatTimestamp(connection.first_posted_at, { dateOnly: true })} to ${formatTimestamp(connection.last_posted_at, { dateOnly: true })}`
    : '';
  const lastImported = connection.last_imported_at ? `Last imported ${formatTimestamp(connection.last_imported_at)}. ` : '';
  const linked = connection.connections.length > 0
    ? `Connected: ${describeConnections(connection.connections)}.`
    : 'No financial account is connected now.';

  return (
    <DataSourceSection
      actions={importButton}
      description={
        <>
          <p>{describeImportedTransactions(connection.transaction_count, connection.sources)}{excluded}{posted}.</p>
          <p className="ui-text-sm ui-text-muted">{lastImported}{linked}{stripeNote}</p>
        </>
      }
      meta={connection.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
      title="Imported transactions"
    >
      {children}
    </DataSourceSection>
  );
}
