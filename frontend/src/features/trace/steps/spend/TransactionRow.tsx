/* One private transaction in the trace: date and status, raw description, the signed amount with whether it counts toward
   the baseline, and its source when the rows' sources differ. Rows outside the baseline are muted and labelled in words, and
   an excluded row names its reason, so the mark doesn't rely on colour alone. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Badge, Icon } from '../../../../shared/ui';
import type { OfferTrace } from '../../types';
import './TransactionRow.css';

type TraceTransaction = OfferTrace['transactions'][number];

interface TransactionRowProps {
  transaction: TraceTransaction;
  // False when every row shares one source, which the table then states once above the rows.
  isSourceShown: boolean;
}

/** Render one transaction row for the trace's transactions table. */
export function TransactionRow({ transaction, isSourceShown }: TransactionRowProps): JSX.Element {
  const isCredit = transaction.direction === 'credit';
  return (
    <tr className={transaction.counts_toward_baseline ? undefined : 'trace-transaction--not-counted'}>
      <td>
        <div className="trace-transaction__meta">
          <span className="trace-transaction__date">{formatTimestamp(transaction.posted_at, { dateOnly: true })}</span>
          <span aria-hidden="true"> · </span>
          <span className="ui-visually-hidden">, status: </span>
          <span>{transaction.status}</span>
        </div>
        <code className="trace-transaction__description">{transaction.raw_description}</code>
        {transaction.is_excluded ? (
          <div className="trace-transaction__excluded">Excluded: {transaction.excluded_reason ?? 'no reason recorded'}</div>
        ) : null}
      </td>
      {/* Amount and baseline share a cell, so the table fits a phone without scrolling sideways. */}
      <td className="ui-num">
        <div className="trace-transaction__amount">
          {/* Amounts arrive unsigned with the sign in direction; without the minus a refund reads as one more payment. */}
          {isCredit ? '−' : ''}
          <MoneyDisplay amountMinor={transaction.amount_minor} currency={transaction.currency} />
        </div>
        <div className="trace-transaction__flags">
          {isCredit ? <Badge tone="info">credit / refund</Badge> : null}
          {transaction.counts_toward_baseline
            ? <Badge icon={<Icon name="check" />} tone="success">Counted</Badge>
            : <Badge tone="neutral">Not counted</Badge>}
        </div>
      </td>
      {isSourceShown ? <td><ProvenanceBadge kind="financial" value={transaction.source_type} /></td> : null}
    </tr>
  );
}
