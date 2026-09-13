/* One private transaction in the trace: date, raw description, signed amount, status, whether it counts, and its source.
   Rows outside the baseline are muted and labelled in words, so the mark doesn't rely on colour alone. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Badge, Icon } from '../../../../shared/ui';
import type { OfferTrace } from '../../types';
import './TransactionRow.css';

type TraceTransaction = OfferTrace['transactions'][number];

/** Render one transaction row for the trace's transactions table. */
export function TransactionRow({ transaction }: { transaction: TraceTransaction }): JSX.Element {
  const isCredit = transaction.direction === 'credit';
  return (
    <tr className={transaction.counts_toward_baseline ? undefined : 'trace-transaction--not-counted'}>
      <td className="trace-transaction__date">{formatTimestamp(transaction.posted_at, { dateOnly: true })}</td>
      <td>
        <code className="trace-transaction__description">{transaction.raw_description}</code>
        {transaction.is_excluded ? <div className="ui-text-xs">excluded: {transaction.excluded_reason}</div> : null}
      </td>
      <td className="ui-num">
        {/* Amounts arrive unsigned with the sign in direction; without the minus a refund reads as one more payment. */}
        {isCredit ? '−' : ''}
        <MoneyDisplay amountMinor={transaction.amount_minor} currency={transaction.currency} />
        {isCredit ? <div><Badge tone="info">credit / refund</Badge></div> : null}
      </td>
      <td>{transaction.status}</td>
      <td>
        {transaction.counts_toward_baseline
          ? <Badge icon={<Icon name="check" />} tone="success">Counted</Badge>
          : <Badge tone="neutral">Not counted</Badge>}
      </td>
      <td><ProvenanceBadge kind="financial" value={transaction.source_type} /></td>
    </tr>
  );
}
