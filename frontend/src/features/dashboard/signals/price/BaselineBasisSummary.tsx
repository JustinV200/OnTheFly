/* States which charges the dashboard baseline came from and which were left out.
   The owner sees this before publishing, because the baseline pre-fills the listing price. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { Stack } from '../../../../shared/ui';
import { formatPostedDate } from '../formatSignals';
import type { BaselineExplanation } from '../types';

interface BaselineBasisSummaryProps {
  baseline: BaselineExplanation;
}

/** Render the baseline amount with a sentence explaining its basis and exclusions. */
export function BaselineBasisSummary({ baseline }: BaselineBasisSummaryProps): JSX.Element {
  const oneOffCount = baseline.excluded_one_off_transaction_ids.length;
  const unconfirmedCount = baseline.excluded_unconfirmed_transaction_ids.length;
  const chargeCount = baseline.supporting_transaction_ids.length;

  return (
    <Stack gap={1}>
      <p>
        <strong>
          Baseline: <MoneyDisplay amountMinor={baseline.amount_minor} currency={baseline.currency} /> / {baseline.cadence}
        </strong>
      </p>
      <p className="ui-text-sm ui-text-muted">
        {baseline.basis === 'current_price_level'
          ? `Median of the ${chargeCount} ${plural(chargeCount, 'charge')} at the current price, since ${formatPostedDate(baseline.basis_started_at)}.`
          : `Average of all ${chargeCount} ${plural(chargeCount, 'charge')}.`}
        {oneOffCount > 0 ? ` Left out: ${oneOffCount} one-off ${plural(oneOffCount, 'charge')}.` : ''}
        {unconfirmedCount > 0
          ? ` Left out until confirmed: the latest ${plural(unconfirmedCount, 'charge')} at a different price.`
          : ''}
      </p>
    </Stack>
  );
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
