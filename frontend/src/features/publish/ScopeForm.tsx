/* Collects scope confirmation and disclosure choices for a draft listing.
   It gathers owner input only; submission side effects live in the publish hook. */
import { FormEvent, ReactNode, useEffect, useState } from 'react';

import { TriStateSelect } from '../../shared/components/TriStateSelect';
import { formatMinorForInput } from '../../shared/format/formatMinorForInput';
import { parseDollarsToMinor } from '../../shared/format/parseDollarsToMinor';
import { DisclosureChoices } from './DisclosureChoices';
import type { PublishableExpense, PublishChoices } from './types';

// Cadences the backend can restate per month (backend app/core/cadence.py).
const CADENCES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];

interface ScopeFormProps {
  expenses: PublishableExpense[];
  initialExpenseId: string | null;
  isPublishing: boolean;
  isSubmitting: boolean;
  // Called on every owner edit, in the same update as the new value, so a preview of the old values can't be published.
  onEdit: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

/** Render the scope-confirmation form for creating a draft listing; every edit is reported through onEdit. */
export function ScopeForm({ expenses, initialExpenseId, isPublishing, isSubmitting, onEdit, onSubmit }: ScopeFormProps): JSX.Element {
  const [expenseId, setExpenseId] = useState<string>('');
  // Demo-template defaults (plan1.md §4). The owner confirms or edits every one before previewing.
  const [serviceArea, setServiceArea] = useState('San Francisco Bay Area');
  const [locationApproximate, setLocationApproximate] = useState('San Francisco, CA');
  const [squareFootage, setSquareFootage] = useState('8000');
  const [visitFrequency, setVisitFrequency] = useState('3x weekly');
  const [bathroomCount, setBathroomCount] = useState('4');
  const [requiredTasks, setRequiredTasks] = useState('vacuum, trash, restrooms');
  const [suppliesIncluded, setSuppliesIncluded] = useState<boolean | null>(null);
  const [equipmentIncluded, setEquipmentIncluded] = useState<boolean | null>(null);
  const [taxesIncluded, setTaxesIncluded] = useState<boolean | null>(null);
  const [currentPrice, setCurrentPrice] = useState('');
  const [billingCadence, setBillingCadence] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [incumbentVendorName, setIncumbentVendorName] = useState('');
  const [choices, setChoices] = useState<PublishChoices>({ bidding_mode: 'sealed', show_exact_address: false, show_incumbent_vendor: false });
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectExpense = (expense: PublishableExpense): void => {
    setExpenseId(expense.id);
    // Prefill the transaction baseline so the owner confirms or corrects it (roadmap 04, publish
    // step 2). The server publishes this price and cadence as a pair.
    setCurrentPrice(formatMinorForInput(expense.amount_minor_per_period));
    setBillingCadence(expense.cadence);
  };

  // Expenses load asynchronously; select the one the dashboard linked to, else the first.
  useEffect(() => {
    if (!expenseId && expenses.length > 0) {
      selectExpense(expenses.find((expense) => expense.id === initialExpenseId) ?? expenses[0]);
    }
  }, [expenses, expenseId, initialExpenseId]);

  const selected = expenses.find((expense) => expense.id === expenseId);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const priceMinor = parseDollarsToMinor(currentPrice);
    if (priceMinor === null) {
      setValidationError('Enter the current price as dollars, for example 2400 or 2,400.00.');
      return;
    }
    const tasks = requiredTasks.split(',').map((task) => task.trim()).filter(Boolean);
    setValidationError(null);
    void onSubmit({
      expense_id: expenseId,
      scope: {
        service_area: serviceArea || null,
        location_approximate: locationApproximate || null,
        square_footage: toOptionalInteger(squareFootage),
        visit_frequency: visitFrequency || null,
        bathroom_count: toOptionalInteger(bathroomCount),
        required_tasks: tasks.length > 0 ? tasks : null,
        supplies_included: suppliesIncluded,
        equipment_included: equipmentIncluded,
        taxes_included: taxesIncluded,
        current_price_minor: priceMinor,
        current_price_currency: selected?.currency ?? 'USD',
        billing_cadence: billingCadence,
        // End of the chosen day in the owner's timezone; the server stores it as UTC.
        challenge_deadline: deadlineDate ? new Date(`${deadlineDate}T23:59:59`).toISOString() : null,
        incumbent_vendor_name: incumbentVendorName || null,
      },
      choices: { ...choices, show_incumbent_vendor: choices.show_incumbent_vendor && incumbentVendorName.trim() !== '' },
    });
  };

  return (
    // React change events bubble, so this one handler hears every input, select, and checkbox below,
    // DisclosureChoices included. New controls must stay native inputs inside this form to be covered.
    <form onChange={onEdit} onSubmit={submit}>
      <h2 style={{ marginBottom: '0.25rem' }}>1. Confirm the scope</h2>
      <p style={{ color: '#475569', marginTop: 0 }}>A price with no scope isn’t something anyone can meaningfully counter.</p>
      <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Field label="Expense">
          <select onChange={(event) => { const expense = expenses.find((candidate) => candidate.id === event.target.value); if (expense) { selectExpense(expense); } }} value={expenseId}>
            {expenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.vendor}</option>)}
          </select>
        </Field>
        <Field label="Service area"><input onChange={(event) => setServiceArea(event.target.value)} value={serviceArea} /></Field>
        <Field label="Approximate location"><input onChange={(event) => setLocationApproximate(event.target.value)} value={locationApproximate} /></Field>
        <Field label="Square footage"><input inputMode="numeric" onChange={(event) => setSquareFootage(event.target.value)} value={squareFootage} /></Field>
        <Field label="Visit frequency (e.g. 3x weekly)"><input onChange={(event) => setVisitFrequency(event.target.value)} value={visitFrequency} /></Field>
        <Field label="Bathrooms"><input inputMode="numeric" onChange={(event) => setBathroomCount(event.target.value)} value={bathroomCount} /></Field>
        <Field label="Required tasks (comma separated)"><input onChange={(event) => setRequiredTasks(event.target.value)} value={requiredTasks} /></Field>
        <TriStateSelect label="Supplies" onChange={setSuppliesIncluded} value={suppliesIncluded} />
        <TriStateSelect label="Equipment" onChange={setEquipmentIncluded} value={equipmentIncluded} />
        <TriStateSelect label="Taxes" onChange={setTaxesIncluded} value={taxesIncluded} />
        <Field label="Current price ($, confirm or correct)"><input inputMode="decimal" onChange={(event) => setCurrentPrice(event.target.value)} value={currentPrice} /></Field>
        <Field label="Billing cadence">
          <select onChange={(event) => setBillingCadence(event.target.value)} value={billingCadence}>
            {/* An inferred cadence like "irregular" stays selectable so the server can explain why it can't publish. */}
            {(CADENCES.includes(billingCadence) || !billingCadence ? CADENCES : [billingCadence, ...CADENCES]).map((cadence) => (
              <option key={cadence} value={cadence}>{cadence}</option>
            ))}
          </select>
        </Field>
        <Field label="Offer deadline (optional)"><input onChange={(event) => setDeadlineDate(event.target.value)} type="date" value={deadlineDate} /></Field>
        <Field label="Current vendor name (optional, hidden by default)"><input onChange={(event) => setIncumbentVendorName(event.target.value)} value={incumbentVendorName} /></Field>
      </div>

      <DisclosureChoices choices={choices} incumbentVendorName={incumbentVendorName} onChange={setChoices} />
      {validationError ? <p role="alert" style={{ color: '#991b1b' }}>{validationError}</p> : null}
      {/* Re-drafting while a publish is on the wire would race it on the server. */}
      <button disabled={isSubmitting || isPublishing || !expenseId} type="submit">
        {isSubmitting ? 'Preparing preview…' : '2. Preview exactly what goes public'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function toOptionalInteger(text: string): number | null {
  // Blank means "not specified", which the scope keeps distinct from zero.
  const trimmed = text.trim().replace(/,/g, '');
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}
