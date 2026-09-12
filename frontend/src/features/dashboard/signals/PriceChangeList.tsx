/* Lists Compound Eye price-level findings: confirmed changes, an earlier price that was never established,
   an unconfirmed jump, or why none were checked. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatBasisPoints, formatPostedDate } from './formatSignals';
import type { NotAssessedReason, PriceLevelAnalysis } from './types';

interface PriceChangeListProps {
  priceLevels: PriceLevelAnalysis;
  currency: string;
}

// An unchecked analysis is stated with its reason, never shown as "no price changes".
const NOT_ASSESSED_TEXT: Record<NotAssessedReason, string> = {
  cadence_not_recurring: 'Price changes not checked: this spend does not recur on a regular schedule.',
  too_few_charges: 'Price changes not checked: fewer than 3 charges.',
  mixed_currency: 'Price changes not checked: charges are in more than one currency.',
  amounts_too_variable: 'No stable price to track: amounts differ from charge to charge.',
};

/** Render price changes, an unestablished earlier price, a pending change, or the reason price levels were not assessed. */
export function PriceChangeList({ priceLevels, currency }: PriceChangeListProps): JSX.Element {
  if (!priceLevels.is_assessed) {
    return (
      <p style={{ color: '#475569' }}>
        {priceLevels.not_assessed_reason ? NOT_ASSESSED_TEXT[priceLevels.not_assessed_reason] : 'Price changes not checked.'}
      </p>
    );
  }

  const { shifts, pending_change: pending, unconfirmed_earlier_price: earlier } = priceLevels;

  return (
    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.1rem' }}>
      {shifts.length === 0 && !pending && !earlier ? <li>No price changes found across these charges.</li> : null}
      {earlier ? (
        // Never "Price changed": the opening charge never became a price to change from. Nor
        // "one-off": a real price that changed after one period looks exactly the same.
        <li>
          Earlier price not established:{' '}
          {earlier.transaction_ids.length === 1 ? (
            <>
              the first charge (<MoneyDisplay amountMinor={earlier.amount_minor} currency={currency} />,{' '}
              {formatPostedDate(earlier.first_seen_at)}) differs from the charges after it, and no charge repeated that
              amount before the price moved.
            </>
          ) : (
            <>
              the first {earlier.transaction_ids.length} charges (median{' '}
              <MoneyDisplay amountMinor={earlier.amount_minor} currency={currency} />, from{' '}
              {formatPostedDate(earlier.first_seen_at)}) differ from the charges after them, and too few repeated that
              amount before the price moved.
            </>
          )}{' '}
          Not counted as a price change, and left out of the baseline.
        </li>
      ) : null}
      {shifts.map((shift) => (
        <li key={shift.transaction_id}>
          Price changed {formatPostedDate(shift.changed_at)}:{' '}
          <MoneyDisplay amountMinor={shift.previous_amount_minor} currency={currency} /> →{' '}
          <MoneyDisplay amountMinor={shift.new_amount_minor} currency={currency} /> ({formatBasisPoints(shift.change_basis_points)})
        </li>
      ))}
      {pending ? (
        <li>
          Possible price change, not yet confirmed: latest charge{' '}
          <MoneyDisplay amountMinor={pending.latest_amount_minor} currency={currency} /> vs the{' '}
          <MoneyDisplay amountMinor={pending.level_amount_minor} currency={currency} /> price (
          {formatBasisPoints(pending.change_basis_points)}). The next charge will confirm or rule it out.
        </li>
      ) : null}
    </ul>
  );
}
