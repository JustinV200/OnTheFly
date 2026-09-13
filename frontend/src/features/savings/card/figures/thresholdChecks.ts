/* Turns one card's API figures and its API thresholds into the pass line's checks ("Savings ≥ 10% ✓ · ≥ 3 suppliers ✓
   (5)"). Display-only comparisons of numbers the server already computed; the card's tier and reasons stay the server's
   verdict. An unavailable source is "not checked" and a missing figure is "not computed", never a pass or a fail. */
import type { SavingsCardView } from '../../types';

export type CheckOutcome = 'met' | 'not_met' | 'not_checked' | 'not_computed';

export interface ThresholdCheck {
  key: string;
  label: string;
  outcome: CheckOutcome;
  // The card's own figure beside the threshold, e.g. "12.4%" or "5"; null when there is none to show.
  detail: string | null;
}

/** Return the checks in the order the server applies them: percentage, annual amount, suppliers, cut fits remainder. */
export function thresholdChecks(card: SavingsCardView): ThresholdCheck[] {
  const { thresholds, inputs } = card;
  const basisPoints = card.modeled_savings_basis_points;
  const annual = card.annual_savings_minor;
  const suppliers = inputs.suppliers;
  const cut = card.suggested_cut_minor;
  const remainder = inputs.remainder_minor;

  return [
    {
      key: 'percent',
      label: `Savings ≥ ${percentText(thresholds.min_basis_points)}`,
      outcome: basisPoints === null ? 'not_computed' : basisPoints >= thresholds.min_basis_points ? 'met' : 'not_met',
      detail: basisPoints === null ? null : percentText(basisPoints),
    },
    {
      key: 'annual',
      // The threshold is an annual amount by definition, so "/yr" is its own unit, not a conversion.
      label: `≥ ${wholeMoneyText(thresholds.min_annual_minor, card.currency)}/yr`,
      outcome: annual === null ? 'not_computed' : annual >= thresholds.min_annual_minor ? 'met' : 'not_met',
      detail: null,
    },
    {
      key: 'suppliers',
      label: `≥ ${thresholds.min_suppliers} suppliers`,
      outcome: suppliers.status === 'unavailable'
        ? 'not_checked'
        : suppliers.status === 'no_match' || suppliers.count.distinct_uei_count < thresholds.min_suppliers ? 'not_met' : 'met',
      detail: suppliers.status === 'unavailable' ? null : suppliers.status === 'no_match' ? 'no match found' : String(suppliers.count.distinct_uei_count),
    },
    {
      key: 'fits',
      label: 'Cut fits your remainder',
      outcome: remainder === null ? 'not_met' : cut === null ? 'not_computed' : cut <= remainder ? 'met' : 'not_met',
      detail: remainder === null ? 'no starting price' : null,
    },
  ];
}

function percentText(basisPoints: number): string {
  const percent = basisPoints / 100;
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1)}%`;
}

function wholeMoneyText(amountMinor: number, currency: string): string {
  // Thresholds are round numbers; cents would only add noise. Amounts with cents keep them.
  // Both digits are set: a maximum below the currency's default minimum throws a RangeError.
  const digits = amountMinor % 100 !== 0 ? 2 : 0;
  return new Intl.NumberFormat('en-US', { currency, style: 'currency', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amountMinor / 100);
}
