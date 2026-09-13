/* Lists the Stripe sandbox transactions already imported for this business, inside a disclosure so the panel stays short.
   Every row keeps its own provenance badge, and amounts render from integer minor units through MoneyDisplay. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Table } from '../../../shared/ui';
import type { ExpenseTransaction } from '../../dashboard/types';
import './StripeTransactionList.css';

interface StripeTransactionListProps {
  transactions: ExpenseTransaction[];
}

/** Render the imported Stripe rows (the API returns at most the latest 100) or say none are imported yet. */
export function StripeTransactionList({ transactions }: StripeTransactionListProps): JSX.Element {
  return (
    <details className="stripe-transactions">
      <summary>Imported Stripe sandbox transactions (latest 100)</summary>
      <div className="stripe-transactions__content">
        {transactions.length === 0 ? (
          <p className="ui-text-muted ui-text-sm">No transactions imported yet.</p>
        ) : (
          <Table density="compact" label="Imported Stripe sandbox transactions" minWidth="640px">
            <thead>
              <tr>
                <th scope="col">Posted</th>
                <th scope="col">Description</th>
                <th scope="col">Direction</th>
                <th scope="col">Status</th>
                <th scope="col">Source</th>
                <th className="ui-num" scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id}>
                  <td className="ui-num">{formatTimestamp(row.posted_at, { dateOnly: true })}</td>
                  <td className="stripe-transactions__description">{row.raw_description}</td>
                  <td>{row.direction}</td>
                  <td>{row.status}</td>
                  <td><ProvenanceBadge kind="financial" value={row.source_type} /></td>
                  <td className="ui-num"><MoneyDisplay amountMinor={row.amount_minor} currency={row.currency} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </details>
  );
}
