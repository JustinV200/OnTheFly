/* Lists every stored transaction behind one expense: statement text and amount, then date, status, direction, and source.
   A list rather than a nested table, because the expense table stacks into cards on a phone and would restyle an inner table. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge } from '../../../shared/ui';
import type { ExpenseTransaction } from '../types';
import './SupportingTransactionList.css';

interface SupportingTransactionListProps {
  transactions: ExpenseTransaction[];
}

/** Render one row per transaction in the order the API returns them, each with its own provenance badge. */
export function SupportingTransactionList({ transactions }: SupportingTransactionListProps): JSX.Element {
  return (
    <ul className="supporting-transactions">
      {transactions.map((transaction) => (
        <li className="supporting-transactions__item" key={transaction.id}>
          <div className="supporting-transactions__main">
            <code className="supporting-transactions__description">{transaction.raw_description}</code>
            <span className="supporting-transactions__amount">
              <MoneyDisplay amountMinor={transaction.amount_minor} currency={transaction.currency} />
            </span>
          </div>
          <div className="supporting-transactions__meta">
            <span className="ui-num">{formatTimestamp(transaction.posted_at, { dateOnly: true })}</span>
            {/* Pending Stripe charges and credits stay listed for audit but don't count toward the baseline. */}
            <span>{transaction.status} · {transaction.direction}</span>
            <ProvenanceBadge kind="financial" value={transaction.source_type} />
            {transaction.is_excluded ? <Badge tone="neutral">Excluded from spend: {transaction.excluded_reason}</Badge> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
