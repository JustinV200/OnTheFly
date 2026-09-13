/* Lists every stored transaction behind one expense: date, statement text, and amount, with status and direction beneath.
   Provenance is stated once above the list when every row shares it, otherwise on each row. Rows excluded from spend
   stay listed for audit, marked with the reason in words. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, joinClassNames } from '../../../shared/ui';
import { sharedProvenance } from '../provenance/sharedProvenance';
import type { ExpenseTransaction } from '../types';
import './SupportingTransactionList.css';

interface SupportingTransactionListProps {
  transactions: ExpenseTransaction[];
}

/** Render one row per transaction in the order the API returns them. */
export function SupportingTransactionList({ transactions }: SupportingTransactionListProps): JSX.Element {
  if (transactions.length === 0) {
    return <p className="ui-text-sm ui-text-muted">No stored transactions are linked to this expense.</p>;
  }

  const commonProvenance = sharedProvenance(transactions.map((transaction) => [transaction.source_type]));
  return (
    <div className="supporting-transactions">
      <div className="supporting-transactions__header">
        <span>{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}</span>
        {commonProvenance ? (
          <span className="supporting-transactions__shared">
            All: {commonProvenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
          </span>
        ) : null}
      </div>
      <ul className="supporting-transactions__list">
        {transactions.map((transaction) => (
          <li
            className={joinClassNames('supporting-transactions__item', transaction.is_excluded && 'supporting-transactions__item--excluded')}
            key={transaction.id}
          >
            <span className="supporting-transactions__date ui-num">{formatTimestamp(transaction.posted_at, { dateOnly: true })}</span>
            <code className="supporting-transactions__description">{transaction.raw_description}</code>
            <span className="supporting-transactions__amount">
              <MoneyDisplay amountMinor={transaction.amount_minor} currency={transaction.currency} />
            </span>
            <span className="supporting-transactions__meta">
              {/* Pending Stripe charges and credits stay listed for audit but don't count toward the baseline. */}
              <span>{transaction.status} · {transaction.direction}</span>
              {commonProvenance ? null : <ProvenanceBadge kind="financial" value={transaction.source_type} />}
              {transaction.is_excluded ? <Badge tone="neutral">Excluded from spend: {transaction.excluded_reason}</Badge> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
