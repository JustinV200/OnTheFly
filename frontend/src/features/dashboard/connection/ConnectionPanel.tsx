/* The acting business's own connection inside Data sources: loading or failed status, no account connected, a connection
   with nothing to import here, or the Hackathon demo ledger's row. It reads the same records as StripeConnection and only
   imports demo links; Stripe links import from the Stripe sandbox row. The "no account" state's primary action starts
   the same Stripe connect as that row, through the page's one useStripeConnection result.
   Privacy is stated once per page (the Spend header badge and each row's Visibility), so it is not repeated here. */
import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Button, ButtonLink, Cluster } from '../../../shared/ui';
import { DataSourceSection } from '../../connections/sources/DataSourceSection';
import { DemoLedgerRow } from './DemoLedgerRow';
import { describeConnections } from './describe/describeConnections';
import type { ConnectionStatus, ImportState } from './types';

interface ConnectionPanelProps {
  businessName: string;
  status: ApiQueryState<ConnectionStatus>;
  importState: ImportState;
  onImport: () => void;
  // Starts Stripe's consent flow; the same connect the Stripe sandbox row offers, so the two never disagree.
  onConnectStripe: () => void;
  // True while that connect (or a Stripe import) is running, so this button shows the same busy state as the row's.
  isConnectingStripe: boolean;
}

/** Render the connection state for Spend; nothing when only a Stripe link has already imported. */
export function ConnectionPanel({
  businessName, status, importState, onImport, onConnectStripe, isConnectingStripe,
}: ConnectionPanelProps): JSX.Element | null {
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
          action={(
            <Cluster gap={2}>
              {/* Connecting is the next step, so it is the primary action, and it does what it says: it opens Stripe's
                  consent flow. Progress and the result show on the Stripe sandbox row just below. */}
              <Button isBusy={isConnectingStripe} onClick={onConnectStripe} variant="primary">
                {isConnectingStripe ? 'Connecting…' : 'Connect a Stripe sandbox'}
              </Button>
              <ButtonLink to="/marketplace">Browse markets</ButtonLink>
            </Cluster>
          )}
          title="No financial account connected"
        >
          {businessName} hasn’t connected a financial account, so it has no private expenses to show. Import transactions
          to see its spend here, or bid on other businesses’ public listings instead.
        </EmptyState>
      ) : (
        <EmptyState title="Connected, but nothing imported yet">
          Connected: {describeConnections(connection.connections)}.
          {hasStripeLink ? ' Stripe sandbox transactions import from the Stripe sandbox row below.' : ''}
        </EmptyState>
      )}
    </DataSourceSection>
  );
}
