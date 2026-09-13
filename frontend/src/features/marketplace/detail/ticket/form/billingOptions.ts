/* The billing periods a bidder can pick in the ticket. Duplicated from the challenge form's list (PriceFields.tsx keeps
   its list private), with readable labels; values must stay in sync with BillingFrequency in
   backend/app/api/challenges/schemas.py, since the challenge page passes the chosen value straight to the API. */

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

/** Start the ticket on the listing's own cadence when it is one of the options, else monthly. The bidder sees and can
    change it; it only saves re-picking the period most offers will match. */
export function initialBilling(listingCadence: string): string {
  return BILLING_OPTIONS.some((option) => option.value === listingCadence) ? listingCadence : 'monthly';
}
