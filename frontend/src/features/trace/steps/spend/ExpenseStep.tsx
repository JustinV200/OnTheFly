/* Step 6 of the offer trace: the private recurring expense behind the baseline, with its financial provenance.
   Not every transaction listed in step 7 is behind these figures, so the link down says how many were counted. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Grid, Stat } from '../../../../shared/ui';
import { TraceStep } from '../../chain/TraceStep';
import type { OfferTrace } from '../../types';

interface ExpenseStepProps {
  expense: OfferTrace['expense'];
  transactions: OfferTrace['transactions'];
}

/** Render the expense step: per-period amount, annualized amount, payment count and span, and recurrence confidence. */
export function ExpenseStep({ expense, transactions }: ExpenseStepProps): JSX.Element {
  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={expense.currency} />;
  return (
    <TraceStep
      badges={expense.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
      leadsTo={describeTransactionCounts(transactions)}
      step={6}
      title={`Private expense: ${expense.vendor}`}
    >
      <Grid gap={5} minItemWidth="8rem">
        <Stat label={`Per ${expense.cadence} period`} size="md" value={money(expense.amount_minor_per_period)} />
        <Stat label="Annualized" size="md" value={money(expense.annualized_amount_minor)} />
        <Stat
          caption={`${formatTimestamp(expense.first_seen, { dateOnly: true })} to ${formatTimestamp(expense.last_seen, { dateOnly: true })}`}
          label="Payments"
          size="md"
          value={expense.period_count}
        />
        <Stat label="Recurrence confidence" size="md" value={`${Math.round(expense.recurrence_confidence * 100)}%`} />
      </Grid>
    </TraceStep>
  );
}

function describeTransactionCounts(transactions: OfferTrace['transactions']): string {
  const countedCount = transactions.filter((transaction) => transaction.counts_toward_baseline).length;
  const noun = transactions.length === 1 ? 'transaction' : 'transactions';
  return `${transactions.length} ${noun} from this vendor, ${countedCount} counted in the baseline`;
}
