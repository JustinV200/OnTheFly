/* Shows the acting business's financial connections: not connected, connected, or what was imported and from where.
   It reads the same records as StripeConnection, and it only imports demo links; Stripe links import from that panel.
   It renders as one section of the dashboard's Data sources card. */
import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Button, ButtonLink } from '../../../shared/ui';
import { DataSourceSection } from '../../connections/sources/DataSourceSection';
import { describeConnections } from './describe/describeConnections';
import { sourceLabel } from './describe/sourceLabel';
import { ImportedConnectionSummary } from './ImportedConnectionSummary';
import { ImportOutcomeNotice } from './ImportOutcomeNotice';
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
    return (
      <DataSourceSection>
        {status.error
          ? <ErrorState error={status.error} onRetry={status.reload} title="Couldn’t load this business’s connection" />
          : <LoadingSpinner label="Checking the financial connection…" />}
      </DataSourceSection>
    );
  }

  const connection = status.data;
  // Only a demo link imports here. A Stripe link waits for Stripe's refresh in StripeConnection, and offering a
  // fixture import to a Stripe-only business would mix demo data into its private dashboard.
  const importable = connection.connections.find((link) => link.imported_through === 'connection_import');
  const hasStripeLink = connection.connections.some((link) => link.imported_through === 'stripe_sync');
  const isRunning = importState.phase === 'running';
  const isImported = connection.status === 'imported';
  const importLabel = importable ? sourceLabel(importable.provider, importable.provenance) : '';
  const importButton = importable ? (
    // The first import is the one next step on an empty dashboard, so it is primary; a later refresh is secondary.
    <Button isBusy={isRunning} onClick={onImport} variant={isImported ? 'secondary' : 'primary'}>
      {isRunning
        ? 'Importing… (everything lands private)'
        : isImported ? `Refresh ${importLabel} import` : `Import ${importLabel} transactions`}
    </Button>
  ) : null;
  const stripeNote = hasStripeLink ? ' Stripe sandbox transactions import from the Stripe panel below.' : '';
  const outcome = <ImportOutcomeNotice importState={importState} />;

  if (isImported) {
    return (
      <ImportedConnectionSummary connection={connection} importButton={importButton} stripeNote={stripeNote}>
        {outcome}
      </ImportedConnectionSummary>
    );
  }

  return (
    <DataSourceSection>
      {connection.status === 'not_connected' ? (
        <EmptyState
          action={<ButtonLink to="/marketplace" variant="primary">Browse public listings to challenge</ButtonLink>}
          title="No financial account connected"
        >
          {businessName} hasn’t connected a financial account, so it has no private expenses to show. Connect a Stripe
          sandbox account below to import transactions, or browse the marketplace and challenge other businesses’ public listings.
        </EmptyState>
      ) : (
        <EmptyState action={importButton} title="Connected, but nothing imported yet">
          Connected: {describeConnections(connection.connections)}.
          {importable ? ` Importing reads transaction history from ${importLabel} account ${importable.provider_account_id}.` : ''}
          {stripeNote} Every expense arrives private; nothing is published by importing.
        </EmptyState>
      )}
      {outcome}
    </DataSourceSection>
  );
}
