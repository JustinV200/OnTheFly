/* Shows the acting business's financial connections: not connected, connected, or what was imported and from where.
   It reads the same records as StripeConnection, and it only imports demo links; Stripe links import from that panel. */
import { Link } from 'react-router-dom';

import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { describeConnections } from './describeConnections';
import { describeImportedTransactions } from './describeImportedTransactions';
import { sourceLabel } from './sourceLabel';
import type { ConnectionStatus, ImportState } from './types';

interface ConnectionPanelProps {
  businessName: string;
  status: ApiQueryState<ConnectionStatus>;
  importState: ImportState;
  onImport: () => void;
}

/** Render the connection state and import controls for the private dashboard. */
export function ConnectionPanel({ businessName, status, importState, onImport }: ConnectionPanelProps): JSX.Element {
  if (!status.data) {
    return status.error
      ? <ErrorState error={status.error} onRetry={status.reload} title="Couldn’t load this business’s connection" />
      : <LoadingSpinner label="Checking the financial connection…" />;
  }

  const connection = status.data;
  // Only a demo link imports here. A Stripe link waits for Stripe's refresh in StripeConnection, and offering a
  // fixture import to a Stripe-only business would mix demo data into its private dashboard.
  const importable = connection.connections.find((link) => link.imported_through === 'connection_import');
  const hasStripeLink = connection.connections.some((link) => link.imported_through === 'stripe_sync');
  const isRunning = importState.phase === 'running';
  const importLabel = importable ? sourceLabel(importable.provider, importable.provenance) : '';
  const importButton = importable ? (
    <button disabled={isRunning} onClick={onImport} type="button">
      {isRunning
        ? 'Importing… (everything lands private)'
        : connection.status === 'imported' ? `Refresh ${importLabel} import` : `Import ${importLabel} transactions`}
    </button>
  ) : null;
  const stripeNote = hasStripeLink ? ' Stripe sandbox transactions import from the Stripe panel below.' : '';

  return (
    <section>
      {connection.status === 'not_connected' ? (
        <EmptyState action={<Link to="/marketplace">Browse public listings to challenge</Link>} title="No financial account connected">
          {businessName} hasn’t connected a financial account, so it has no private expenses to show. Connect a Stripe
          sandbox account below to import transactions, or browse the marketplace and challenge other businesses’ public listings.
        </EmptyState>
      ) : null}

      {connection.status === 'connected_not_imported' ? (
        <EmptyState action={importButton} title="Connected, but nothing imported yet">
          Connected: {describeConnections(connection.connections)}.
          {importable ? ` Importing reads transaction history from ${importLabel} account ${importable.provider_account_id}.` : ''}
          {stripeNote} Every expense arrives private; nothing is published by importing.
        </EmptyState>
      ) : null}

      {connection.status === 'imported' ? (
        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginBottom: '0.75rem' }}>
          <span>
            {describeImportedTransactions(connection.transaction_count, connection.sources)}
            {connection.excluded_count > 0
              ? `, ${connection.excluded_count} excluded${connection.excluded_reasons.length > 0 ? ` (${connection.excluded_reasons.join(', ')})` : ''}`
              : ''}
            {connection.first_posted_at && connection.last_posted_at
              ? `, posted ${formatTimestamp(connection.first_posted_at, { dateOnly: true })} to ${formatTimestamp(connection.last_posted_at, { dateOnly: true })}`
              : ''}
            {connection.last_imported_at ? `. Last imported ${formatTimestamp(connection.last_imported_at)}.` : '.'}
            {connection.connections.length > 0
              ? ` Connected: ${describeConnections(connection.connections)}.`
              : ' No financial account is connected now.'}
            {stripeNote}
          </span>
          {connection.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
          {importButton}
        </div>
      ) : null}

      {importState.phase === 'failed' ? (
        <ErrorState error={null} title="Import failed">
          <p style={{ margin: 0 }}>{importState.message}</p>
          <p style={{ margin: '0.5rem 0 0' }}>Nothing was published. Previously imported expenses are unchanged.</p>
        </ErrorState>
      ) : null}
      {importState.phase === 'succeeded' ? (
        <p role="status">
          Import complete: {importState.result.new} new, {importState.result.duplicate} already imported,{' '}
          {importState.result.excluded} excluded, {importState.result.failed} failed. Everything imported is private.
        </p>
      ) : null}
    </section>
  );
}
