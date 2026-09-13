/* Presents sandbox connection controls without handling provider requests. */
import { useStripeConnection } from './useStripeConnection';

interface StripeConnectionProps {
  onImported: () => void;
  // Called once consent is stored, so the dashboard's connection summary stops reading "not connected".
  onConnected: () => void;
}

/** Show consent/import controls and an explicit sandbox data label. */
export function StripeConnection({ onImported, onConnected }: StripeConnectionProps): JSX.Element {
  const { connection, transactions, busy, message, connect, refresh } = useStripeConnection(onImported, onConnected);
  return <section aria-label="Stripe sandbox connection" style={{ margin: '1rem 0' }}>
    <strong>Stripe sandbox</strong>
    <p>Connect one simulated checking account. Imported transactions stay private.</p>
    <button type="button" disabled={busy} onClick={() => void connect()}>
      {connection?.connected ? 'Reconnect Stripe' : 'Connect Stripe sandbox'}
    </button>{' '}
    {connection?.connected && <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? 'Importing…' : 'Refresh transactions'}
    </button>}
    {connection?.last_synced_at && <p>Last imported: {new Date(connection.last_synced_at).toLocaleString()}</p>}
    <p role="status" aria-live="polite">{message || (busy ? 'Connecting…' : '')}</p>
    {connection?.connected && <details>
      <summary>Imported Stripe sandbox transactions (latest 100)</summary>
      {!transactions.length && <p>No transactions imported yet.</p>}
      <ul>{transactions.map((row) => <li key={row.id}>
        {new Date(row.posted_at).toLocaleDateString()} · {row.raw_description} ·{' '}
        {new Intl.NumberFormat(undefined, { style: 'currency', currency: row.currency }).format(row.amount_minor / 100)}{' '}
        · {row.direction} · {row.status} · sandbox
      </li>)}</ul>
    </details>}
  </section>;
}
