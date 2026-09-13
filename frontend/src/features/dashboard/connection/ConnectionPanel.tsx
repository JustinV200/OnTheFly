/* The acting business's own connection inside Data sources: loading or failed status, no account connected, a connection
   with nothing to import here, or the Hackathon demo ledger's row. It reads the same records as StripeConnection and only
   imports demo links; Stripe links import from the Stripe sandbox row. */
import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { ButtonLink } from '../../../shared/ui';
import { DataSourceSection } from '../../connections/sources/DataSourceSection';
import { DemoLedgerRow } from './DemoLedgerRow';
import { describeConnections } from './describe/describeConnections';
import type { ConnectionStatus, ImportState } from './types';

interface ConnectionPanelProps {
  businessName: string;
  status: ApiQueryState<ConnectionStatus>;
  importState: ImportState;
  onImport: () => void;
}

/** Render the connection state for Spend; nothing when only a Stripe link has already imported. */
export function ConnectionPanel({ businessName, status, importState, onImport }: ConnectionPanelProps): JSX.Element | null {
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
  // fixture import to a Stripe-only business would mix demo data into its private spend.
  const ledger = connection.connections.find((link) => link.imported_through === 'connection_import');
  if (ledger) {
    return <DemoLedgerRow connection={connection} importState={importState} ledger={ledger} onImport={onImport} />;
  }
  if (connection.status === 'imported') {
    // Totals for a Stripe-only business are in the card's summary line; its row is the Stripe sandbox row.
    return null;
  }

  const hasStripeLink = connection.connections.some((link) => link.imported_through === 'stripe_sync');
  return (
    <DataSourceSection>
      {connection.status === 'not_connected' ? (
        <EmptyState
          action={<ButtonLink to="/marketplace" variant="primary">Browse markets</ButtonLink>}
          title="No financial account connected"
        >
          {businessName} hasn’t connected a financial account, so it has no private expenses to show. Connect a Stripe
          sandbox account below to import transactions, or browse markets and bid on other businesses’ public listings.
        </EmptyState>
      ) : (
        <EmptyState title="Connected, but nothing imported yet">
          Connected: {describeConnections(connection.connections)}.
          {hasStripeLink ? ' Stripe sandbox transactions import from the Stripe sandbox row below.' : ''} Every expense
          arrives private; nothing is published by importing.
        </EmptyState>
      )}
    </DataSourceSection>
  );
}
