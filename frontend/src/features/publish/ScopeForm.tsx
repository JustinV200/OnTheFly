/* Collects scope-confirmation details for a draft listing.
   It gathers owner input only; submission side effects live in the publish hook. */
import { FormEvent, useEffect, useState } from 'react';

import type { PublishableExpense } from './types';

interface ScopeFormProps {
  expenses: PublishableExpense[];
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

/** Render the scope-confirmation form for creating a draft listing. */
export function ScopeForm({ expenses, onSubmit }: ScopeFormProps): JSX.Element {
  const [expenseId, setExpenseId] = useState<string>('');
  const [serviceArea, setServiceArea] = useState<string>('San Francisco Bay Area');
  const [locationApproximate, setLocationApproximate] = useState<string>('San Francisco, CA');
  const [squareFootage, setSquareFootage] = useState<string>('8000');
  const [visitFrequency, setVisitFrequency] = useState<string>('3x weekly');
  const [currentPriceMinor, setCurrentPriceMinor] = useState<string>('');
  const [billingCadence, setBillingCadence] = useState<string>('');
  const [incumbentVendorName, setIncumbentVendorName] = useState<string>('');

  const selectExpense = (expense: PublishableExpense): void => {
    setExpenseId(expense.id);
    // Prefill the transaction baseline so the owner confirms or corrects it (roadmap 04,
    // publish step 2). The server publishes this price and cadence as a pair.
    setCurrentPriceMinor(String(expense.amount_minor_per_period));
    setBillingCadence(expense.cadence);
  };

  // Expenses load asynchronously after mount, so select the first one once they arrive.
  useEffect(() => {
    if (!expenseId && expenses.length > 0) {
      selectExpense(expenses[0]);
    }
  }, [expenses, expenseId]);

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
      <label>Expense<select value={expenseId} onChange={(event) => { const expense = expenses.find((candidate) => candidate.id === event.target.value); if (expense) { selectExpense(expense); } }}>{expenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.vendor}</option>)}</select></label>
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
