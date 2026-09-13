/* Presents the Stripe sandbox row in Spend's Data sources: consent and import controls, progress, and imported rows.
   Provider requests and polling live in useStripeConnection; this file only renders that hook's state. */
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import { Badge, Button, Icon } from '../../shared/ui';
import { DataSourceSection } from './sources/DataSourceSection';
import { stripeMessageKind } from './stripe/stripeMessageKind';
import { StripeStatusNotice } from './stripe/StripeStatusNotice';
import { StripeTransactionList } from './stripe/StripeTransactionList';
import { useStripeConnection } from './useStripeConnection';

interface StripeConnectionProps {
  onImported: () => void;
  // Called once consent is stored, so the dashboard's connection summary stops reading "not connected".
  onConnected: () => void;
}

/** Show consent/import controls, labelled as sandbox data, as one row of the Data sources card. */
export function StripeConnection({ onImported, onConnected }: StripeConnectionProps): JSX.Element {
  const { connection, transactions, busy, message, connect, refresh } = useStripeConnection(onImported, onConnected);
  const isConnected = connection?.connected === true;
  // The hook has no loading flag. Before its first status response lands, nothing is connected, running, or reported;
  // once that request settles, either the connection is set or its failure message is.
  const isCheckingStatus = connection === null && !busy && message === '';

  return (
    <DataSourceSection
      actions={
        <>
          {/* Only a first connect can be running while nothing is connected, so the spinner goes on this button then. */}
          <Button disabled={busy} isBusy={busy && !isConnected} onClick={() => void connect()}>
            {isConnected ? 'Reconnect Stripe' : 'Connect Stripe sandbox'}
          </Button>
          {isConnected ? (
            <Button isBusy={busy} onClick={() => void refresh()}>
              {busy ? 'Importing…' : 'Refresh transactions'}
            </Button>
          ) : null}
        </>
      }
      details={<p>One simulated checking account from Stripe’s sandbox, not a live bank account. Imported transactions stay private.</p>}
      facts={
        connection?.last_synced_at
          ? `Last imported ${formatTimestamp(connection.last_synced_at)}`
          : isConnected ? 'Connected, nothing imported yet.' : 'Connect one simulated checking account. Imported transactions stay private.'
      }
      meta={
        <>
          <ProvenanceBadge kind="financial" value="sandbox" />
          <ConnectionStateBadge connection={connection} message={message} />
        </>
      }
      title="Stripe sandbox"
    >
      <StripeStatusNotice busy={busy} isCheckingStatus={isCheckingStatus} message={message} />
      {isConnected ? <StripeTransactionList transactions={transactions} /> : null}
    </DataSourceSection>
  );
}

interface ConnectionStateBadgeProps {
  connection: { connected: boolean } | null;
  message: string;
}

function ConnectionStateBadge({ connection, message }: ConnectionStateBadgeProps): JSX.Element | null {
  if (!connection) {
    // With no status loaded, a failure (shown below) leaves the state unknown, not "not connected". While it is still
    // loading or a first connect is running, the status line says so and no badge guesses.
    return message && stripeMessageKind(message) === 'failure' ? <Badge tone="warning">Status unknown</Badge> : null;
  }
  return connection.connected
    ? <Badge icon={<Icon name="check" />} tone="success">Connected</Badge>
    : <Badge tone="neutral">Not connected</Badge>;
}
