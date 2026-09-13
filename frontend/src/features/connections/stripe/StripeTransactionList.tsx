/* Lists the Stripe sandbox transactions already imported for this business, behind a disclosure so the row stays short.
   Provenance is stated once above the table when every row shares it, otherwise per row; amounts render from integer
   minor units through MoneyDisplay. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Disclosure, Table } from '../../../shared/ui';
import { sharedProvenance } from '../../dashboard/provenance/sharedProvenance';
import type { ExpenseTransaction } from '../../dashboard/types';
import './StripeTransactionList.css';

interface StripeTransactionListProps {
  transactions: ExpenseTransaction[];
}

/** Render the imported Stripe rows (the API returns at most the latest 100) or say none are imported yet. */
export function StripeTransactionList({ transactions }: StripeTransactionListProps): JSX.Element {
  const commonProvenance = sharedProvenance(transactions.map((row) => [row.source_type]));

  return (
    // The API returns the latest 100 at most, so a full page says it may not be everything.
    <Disclosure summary={`Imported Stripe sandbox transactions (${transactions.length >= 100 ? 'latest 100' : transactions.length})`}>
      {transactions.length === 0 ? (
        <p className="ui-text-muted ui-text-sm">No transactions imported yet.</p>
      ) : (
        <>
          {commonProvenance ? (
            <p className="stripe-transactions__shared">
              All: {commonProvenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
            </p>
          ) : null}
          <Table density="compact" label="Imported Stripe sandbox transactions" minWidth="560px">
            <thead>
              <tr>
                <th scope="col">Posted</th>
                <th scope="col">Description</th>
                <th scope="col">Status</th>
                {commonProvenance ? null : <th scope="col">Source</th>}
                <th className="ui-num" scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id}>
                  <td className="ui-num">{formatTimestamp(row.posted_at, { dateOnly: true })}</td>
                  <td className="stripe-transactions__description">{row.raw_description}</td>
                  <td>{row.status} · {row.direction}</td>
                  {commonProvenance ? null : <td><ProvenanceBadge kind="financial" value={row.source_type} /></td>}
                  <td className="ui-num"><MoneyDisplay amountMinor={row.amount_minor} currency={row.currency} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </Disclosure>
  );
}
