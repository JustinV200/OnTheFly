/* The billing frequencies an offer can be submitted with, in the order the form lists them.
   Must stay in sync with BillingFrequency in backend/app/api/challenges/schemas.py (which also accepts "yearly"). */
export const BILLING_FREQUENCIES: readonly string[] = ['monthly', 'weekly', 'biweekly', 'bimonthly', 'quarterly', 'annual'];
