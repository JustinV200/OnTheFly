/* Shows the acting business's financial connection: not connected, importing, failed, or what was imported.
   Every imported figure lands private, and the panel says so where the import button is. */
import { Link } from 'react-router-dom';

import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
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
  const isRunning = importState.phase === 'running';
  const importButton = (
    <button disabled={isRunning} onClick={onImport} type="button">
      {isRunning ? 'Importing… (everything lands private)' : connection.status === 'imported' ? 'Refresh from account' : 'Import transactions'}
    </button>
  );

  return (
    <section>
      {connection.status === 'not_connected' ? (
        <EmptyState action={<Link to="/marketplace">Browse public listings to challenge</Link>} title="No financial account connected">
          {businessName} has no connected account in this demo, so it has no private expenses to show.
          It can still browse the marketplace and challenge other businesses’ public listings.
        </EmptyState>
      ) : null}

      {connection.status === 'connected_not_imported' ? (
        <EmptyState action={importButton} title="Connected, but nothing imported yet">
          Importing reads transaction history from <code>{connection.provider}</code> account{' '}
          <code>{connection.provider_account_id}</code>. Every expense arrives private; nothing is published by importing.
        </EmptyState>
      ) : null}

      {connection.status === 'imported' ? (
        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginBottom: '0.75rem' }}>
          <span>
            {connection.transaction_count} transactions from <code>{connection.provider ?? 'a past connection'}</code>
            {connection.excluded_count > 0 ? ` (${connection.excluded_count} excluded: payroll, taxes, transfers)` : ''}
            {connection.first_posted_at && connection.last_posted_at
              ? `, posted ${formatTimestamp(connection.first_posted_at, { dateOnly: true })} to ${formatTimestamp(connection.last_posted_at, { dateOnly: true })}`
              : ''}
            {connection.last_imported_at ? `. Last imported ${formatTimestamp(connection.last_imported_at)}.` : '.'}
          </span>
          {connection.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
          {connection.provider ? importButton : null}
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
