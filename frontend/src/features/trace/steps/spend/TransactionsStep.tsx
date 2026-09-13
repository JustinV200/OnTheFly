/* Step 7 of the offer trace: every private transaction filed under the expense's vendor, and which of them set the baseline.
   Refunds and unsettled rows stay listed for audit. Which rows count comes from the server; nothing is re-derived here.
   When every row shares one source, that provenance is stated once above the table instead of on every row (roadmap 11,
   "Spend dashboard"); mixed sources keep a badge per row. The Compound Eye chooses the counted charges, so the step
   carries its fly-brain badge and ends with its note. */
import { FlyBrainBadge } from '../../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../../shared/flybrain/FlyBrainNote';
import type { FlyBrainAttribution } from '../../../../shared/flybrain/types';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Stack, Table } from '../../../../shared/ui';
import { TraceStep } from '../../chain/TraceStep';
import type { OfferTrace } from '../../types';
import { TransactionRow } from './TransactionRow';
import './TransactionsStep.css';

interface TransactionsStepProps {
  transactions: OfferTrace['transactions'];
  // The trace response's fly_brain list; the backend always includes the Compound Eye, even when it didn't run.
  flyBrain: FlyBrainAttribution[];
}

/** Render the original-transactions step, signing credits, marking every row the baseline didn't use, and labelling the circuit. */
export function TransactionsStep({ transactions, flyBrain }: TransactionsStepProps): JSX.Element {
  const compoundEye = flyBrain.find((attribution) => attribution.component === 'compound_eye');
  const sources = [...new Set(transactions.map((transaction) => transaction.source_type))];
  const sharedSource = sources.length === 1 ? sources[0] : null;
  const countedCount = transactions.filter((transaction) => transaction.counts_toward_baseline).length;

  return (
    <TraceStep
      // One-off and earlier-price charges are the circuit's call; its note below says whether it ran for this vendor.
      badges={compoundEye ? <FlyBrainBadge attribution={compoundEye} /> : null}
      step={7}
      title="Original transactions (private, never published)"
    >
      <Stack gap={4}>
        <p className="trace-transactions__note">
          Rows marked “not counted” are listed for audit but did not set the expense baseline in step 6, such as refunds and credits,
          pending or void charges, and one-off or earlier-price charges.
        </p>
        <div className="trace-transactions__summary">
          <span>{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} · {countedCount} counted</span>
          {sharedSource ? <span className="trace-transactions__source">All rows <ProvenanceBadge kind="financial" value={sharedSource} /></span> : null}
        </div>
        <Table density="compact" label="Original transactions" minWidth={sharedSource ? undefined : '440px'}>
          <thead>
            <tr>
              <th>Transaction</th>
              <th className="ui-num">Amount · baseline</th>
              {sharedSource ? null : <th>Source</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <TransactionRow isSourceShown={sharedSource === null} key={transaction.id} transaction={transaction} />
            ))}
          </tbody>
        </Table>
        <FlyBrainNote attributions={flyBrain} />
      </Stack>
    </TraceStep>
  );
}
