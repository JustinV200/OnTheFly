/* Lists Compound Eye price-level findings: confirmed changes, an unconfirmed jump, or why none were checked. */
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
  no_posted_charges: 'Price changes not checked: no charge has posted, only pending, void, or credit rows.',
};

/** Render price changes, a pending change, or the reason price levels were not assessed. */
export function PriceChangeList({ priceLevels, currency }: PriceChangeListProps): JSX.Element {
  if (!priceLevels.is_assessed) {
    return (
      <p style={{ color: '#475569' }}>
        {priceLevels.not_assessed_reason ? NOT_ASSESSED_TEXT[priceLevels.not_assessed_reason] : 'Price changes not checked.'}
      </p>
    );
  }

  const { shifts, pending_change: pending } = priceLevels;

  return (
    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.1rem' }}>
      {shifts.length === 0 && !pending ? <li>No price changes found across these charges.</li> : null}
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
