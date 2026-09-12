/* Collects scope-confirmation details for a draft listing.
   It gathers owner input only; submission side effects live in the publish hook. */
import { FormEvent, useState } from 'react';

import type { PublishableExpense } from './types';

interface ScopeFormProps {
  expenses: PublishableExpense[];
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

/** Render the scope-confirmation form for creating a draft listing. */
export function ScopeForm({ expenses, onSubmit }: ScopeFormProps): JSX.Element {
  const [expenseId, setExpenseId] = useState<string>(expenses[0]?.id ?? '');
  const [serviceArea, setServiceArea] = useState<string>('San Francisco Bay Area');
  const [locationApproximate, setLocationApproximate] = useState<string>('San Francisco, CA');
  const [squareFootage, setSquareFootage] = useState<string>('8000');
  const [visitFrequency, setVisitFrequency] = useState<string>('3x weekly');
  const [currentPriceMinor, setCurrentPriceMinor] = useState<string>('240000');
  const [billingCadence, setBillingCadence] = useState<string>('monthly');
  const [incumbentVendorName, setIncumbentVendorName] = useState<string>('');

  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSubmit({
          expense_id: expenseId,
          scope: {
            billing_cadence: billingCadence,
            current_price_minor: Number(currentPriceMinor),
            incumbent_vendor_name: incumbentVendorName || null,
            location_approximate: locationApproximate,
            service_area: serviceArea,
            square_footage: Number(squareFootage),
            visit_frequency: visitFrequency,
          },
          choices: {
            bidding_mode: 'sealed',
            show_exact_address: false,
            show_incumbent_vendor: false,
          },
        });
      }}
    >
      <h2>Scope confirmation</h2>
      <label>Expense<select value={expenseId} onChange={(event) => setExpenseId(event.target.value)}>{expenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.vendor}</option>)}</select></label>
      <label>Service area<input value={serviceArea} onChange={(event) => setServiceArea(event.target.value)} /></label>
      <label>Approximate location<input value={locationApproximate} onChange={(event) => setLocationApproximate(event.target.value)} /></label>
      <label>Square footage<input value={squareFootage} onChange={(event) => setSquareFootage(event.target.value)} /></label>
      <label>Visit frequency<input value={visitFrequency} onChange={(event) => setVisitFrequency(event.target.value)} /></label>
      <label>Current price (minor units)<input value={currentPriceMinor} onChange={(event) => setCurrentPriceMinor(event.target.value)} /></label>
      <label>Billing cadence<input value={billingCadence} onChange={(event) => setBillingCadence(event.target.value)} /></label>
      <label>Incumbent vendor (optional)<input value={incumbentVendorName} onChange={(event) => setIncumbentVendorName(event.target.value)} /></label>
      <button type="submit">Create draft</button>
    </form>
  );
}
