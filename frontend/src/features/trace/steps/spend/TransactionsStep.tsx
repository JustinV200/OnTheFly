/* Step 7 of the offer trace: every private transaction filed under the expense's vendor, and which of them set the baseline.
   Refunds and unsettled rows stay listed for audit. Which rows count comes from the server; nothing is re-derived here.
   The Compound Eye chooses the counted charges, so the step carries its fly-brain badge and ends with its note. */
import { FlyBrainBadge } from '../../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../../shared/flybrain/FlyBrainNote';
import type { FlyBrainAttribution } from '../../../../shared/flybrain/types';
import { Stack, Table } from '../../../../shared/ui';
import { TraceStep } from '../../chain/TraceStep';
import type { OfferTrace } from '../../types';
import { TransactionRow } from './TransactionRow';

interface TransactionsStepProps {
  transactions: OfferTrace['transactions'];
  // The trace response's fly_brain list; the backend always includes the Compound Eye, even when it didn't run.
  flyBrain: FlyBrainAttribution[];
}

/** Render the original-transactions step, signing credits, marking every row the baseline didn't use, and labelling the circuit. */
export function TransactionsStep({ transactions, flyBrain }: TransactionsStepProps): JSX.Element {
  const compoundEye = flyBrain.find((attribution) => attribution.component === 'compound_eye');
  return (
    <TraceStep
      // One-off and earlier-price charges are the circuit's call; its note below says whether it ran for this vendor.
      badges={compoundEye ? <FlyBrainBadge attribution={compoundEye} /> : null}
      step={7}
      title="Original transactions (private, never published)"
    >
      <Stack gap={4}>
        <p className="ui-text-sm ui-text-muted">
          Rows marked “not counted” are listed for audit but did not set the expense baseline in step 6, such as refunds and credits,
          pending or void charges, and one-off or earlier-price charges.
        </p>
        <Table density="compact" label="Original transactions" minWidth="760px">
          <thead>
            <tr>
              <th>Posted</th>
              <th>Description</th>
              <th className="ui-num">Amount</th>
              <th>Status</th>
              <th>Baseline</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}
          </tbody>
        </Table>
        <FlyBrainNote attributions={flyBrain} />
      </Stack>
    </TraceStep>
  );
}
