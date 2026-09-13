/* Step 7 of the offer trace: every private transaction filed under the expense's vendor, and which of them set the baseline.
   Refunds and unsettled rows stay listed for audit. Which rows count comes from the server; nothing is re-derived here.
   The Compound Eye chooses the counted charges, so the step carries its fly-brain badge and note. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { FlyBrainBadge } from '../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../shared/flybrain/FlyBrainNote';
import type { FlyBrainAttribution } from '../../shared/flybrain/types';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import { TraceStep } from './TraceStep';
import type { OfferTrace } from './types';

type TraceTransaction = OfferTrace['transactions'][number];

interface TransactionsStepProps {
  transactions: OfferTrace['transactions'];
  // The trace response's fly_brain list; the backend always includes the Compound Eye, even when it didn't run.
  flyBrain: FlyBrainAttribution[];
}

/** Render the original-transactions step, signing credits, marking every row the baseline didn't use, and labelling the circuit. */
export function TransactionsStep({ transactions, flyBrain }: TransactionsStepProps): JSX.Element {
  const compoundEye = flyBrain.find((attribution) => attribution.component === 'compound_eye');
  return (
    <TraceStep step={7} title="Original transactions (private, never published)">
      <p style={{ color: '#475569', margin: '0 0 0.5rem' }}>
        Rows marked “not counted” are listed for audit but did not set the expense baseline in step 6, such as refunds and
        credits, pending or void charges, and one-off or earlier-price charges.{' '}
        {/* One-off and earlier-price charges are the circuit's call; its note below says whether it ran for this vendor. */}
        {compoundEye ? <FlyBrainBadge attribution={compoundEye} /> : null}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}><th>Posted</th><th>Description</th><th>Amount</th><th>Status</th><th>Baseline</th><th>Source</th></tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}
          </tbody>
        </table>
      </div>
      <FlyBrainNote attributions={flyBrain} />
    </TraceStep>
  );
}

function TransactionRow({ transaction }: { transaction: TraceTransaction }): JSX.Element {
  const isCredit = transaction.direction === 'credit';
  return (
    // Rows outside the baseline are muted and labelled in words, so the mark doesn't rely on colour alone.
    <tr style={{ borderTop: '1px solid #e2e8f0', color: transaction.counts_toward_baseline ? undefined : '#64748b' }}>
      <td>{formatTimestamp(transaction.posted_at, { dateOnly: true })}</td>
      <td>
        <code>{transaction.raw_description}</code>
        {transaction.is_excluded ? ` (excluded: ${transaction.excluded_reason})` : ''}
      </td>
      <td>
        {/* Amounts arrive unsigned with the sign in direction; without the minus a refund reads as one more payment. */}
        {isCredit ? '−' : ''}
        <MoneyDisplay amountMinor={transaction.amount_minor} currency={transaction.currency} />
        {isCredit ? ' (credit / refund)' : ''}
      </td>
      <td>{transaction.status}</td>
      <td>{transaction.counts_toward_baseline ? 'Counted' : 'Not counted'}</td>
      <td><ProvenanceBadge kind="financial" value={transaction.source_type} /></td>
    </tr>
  );
}
