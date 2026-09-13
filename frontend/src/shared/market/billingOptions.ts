/* The billing periods a bidder can pick, with readable labels, shared by the market page's bid ticket and the full bid
   form so both lists and their words stay identical. Values must stay in sync with BillingFrequency in
   backend/app/api/challenges/schemas.py, since the chosen value goes straight to the API. Words only; nothing converts. */

export interface BillingOption {
  value: string;
  label: string;
}

export const BILLING_OPTIONS: BillingOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'bimonthly', label: 'Every 2 months' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Yearly' },
];

// Spellings the API also accepts or stores that the pick list doesn't offer; a stored offer can still carry one.
const ALIAS_LABELS: Record<string, string> = {
  yearly: 'Yearly',
  annually: 'Yearly',
};

/** Start on the listing's own cadence when it is one of the options, else monthly. The bidder sees and can change it;
    it only saves re-picking the period most offers will match. */
export function initialBilling(listingCadence: string): string {
  return BILLING_OPTIONS.some((option) => option.value === listingCadence) ? listingCadence : 'monthly';
}

/** Return the readable label for a billing value ("annual" -> "Yearly"); an unknown value is shown as stored. */
export function billingLabel(value: string): string {
  return BILLING_OPTIONS.find((option) => option.value === value)?.label ?? ALIAS_LABELS[value] ?? value;
}
