/* The acting business's own connection inside Data sources: loading or failed status, no account connected, a connection
   with nothing to import here, or the Hackathon demo ledger's row. It reads the same records as StripeConnection and only
   imports demo links; Stripe links import from the Stripe sandbox row, which the empty state's own action jumps to.
   Privacy is stated once per page (the Spend header badge and each row's Visibility), so it is not repeated here. */
import { useState } from 'react';

import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Button, ButtonLink, Cluster } from '../../../shared/ui';
import { DataSourceSection } from '../../connections/sources/DataSourceSection';
import { DemoLedgerRow } from './DemoLedgerRow';
import { describeConnections } from './describe/describeConnections';
import { focusStripeRow } from './focusStripeRow';
import type { ConnectionStatus, ImportState } from './types';

interface ConnectionPanelProps {
  businessName: string;
  status: ApiQueryState<ConnectionStatus>;
  importState: ImportState;
  onImport: () => void;
}

/** Render the connection state for Spend; nothing when only a Stripe link has already imported. */
export function ConnectionPanel({ businessName, status, importState, onImport }: ConnectionPanelProps): JSX.Element | null {
  // Set only when the jump below found no Stripe row, so a press that did nothing says why instead of looking broken.
  const [isStripeRowMissing, setIsStripeRowMissing] = useState(false);

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
              {/* The next step is connecting, so it is the primary action and it goes where it says: the Stripe row. */}
              <Button onClick={() => setIsStripeRowMissing(!focusStripeRow())} variant="primary">
                Connect a Stripe sandbox
              </Button>
              <ButtonLink to="/marketplace">Browse markets</ButtonLink>
            </Cluster>
          )}
          title="No financial account connected"
        >
          {businessName} hasn’t connected a financial account, so it has no private expenses to show. Import transactions
          to see its spend here, or bid on other businesses’ public listings instead.
          {isStripeRowMissing ? ' The Stripe sandbox row isn’t on this page; open Data sources below to connect one.' : ''}
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
