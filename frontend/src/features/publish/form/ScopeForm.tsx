/* Collects scope confirmation and disclosure choices for a draft listing.
   It gathers owner input only; submission side effects live in the publish hook. */
import { FormEvent, useEffect, useState } from 'react';

import { ErrorState } from '../../../shared/components/ErrorState';
import { formatMinorForInput } from '../../../shared/format/formatMinorForInput';
import { parseDollarsToMinor } from '../../../shared/format/parseDollarsToMinor';
import { Button, Callout, Cluster, Stack } from '../../../shared/ui';
import type { PublishableExpense, PublishChoices } from '../types';
import { buildDraftPayload } from './buildDraftPayload';
import { DisclosureChoices } from './disclosure/DisclosureChoices';
import { ExpensePicker } from './fields/ExpensePicker';
import { PriceFields } from './fields/PriceFields';
import { ScopeDetailsFields } from './fields/ScopeDetailsFields';
import { INITIAL_SCOPE_FORM_VALUES, ScopeFormValues } from './scopeFormValues';

interface ScopeFormProps {
  expenses: PublishableExpense[];
  initialExpenseId: string | null;
  isPublishing: boolean;
  isSubmitting: boolean;
  // A fresh preview is on screen, so Publish (not Preview) is the step's main action.
  hasFreshPreview: boolean;
  // The server's reason a draft or publish failed, shown by the preview button so the owner can fix the form.
  errorMessage: string | null;
  // Called on every owner edit, in the same update as the new value, so a preview of the old values can't be published.
  onEdit: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

/** Render the scope-confirmation form for creating a draft listing; every edit is reported through onEdit. */
export function ScopeForm({ expenses, initialExpenseId, isPublishing, isSubmitting, hasFreshPreview, errorMessage, onEdit, onSubmit }: ScopeFormProps): JSX.Element {
  const [expenseId, setExpenseId] = useState<string>('');
  const [values, setValues] = useState<ScopeFormValues>(INITIAL_SCOPE_FORM_VALUES);
  const [choices, setChoices] = useState<PublishChoices>({ bidding_mode: 'sealed', show_exact_address: false, show_incumbent_vendor: false });
  const [validationError, setValidationError] = useState<string | null>(null);

  const changeValues = (patch: Partial<ScopeFormValues>): void => setValues((current) => ({ ...current, ...patch }));

  const selectExpense = (expense: PublishableExpense): void => {
    setExpenseId(expense.id);
    // Prefill the transaction baseline so the owner confirms or corrects it (roadmap 04, publish
    // step 2). The server publishes this price and cadence as a pair.
    changeValues({ currentPrice: formatMinorForInput(expense.amount_minor_per_period), billingCadence: expense.cadence });
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
    const priceMinor = parseDollarsToMinor(values.currentPrice);
    if (priceMinor === null) {
      setValidationError('Enter the current price as dollars, for example 2400 or 2,400.00.');
      return;
    }
    setValidationError(null);
    void onSubmit(buildDraftPayload({ expenseId, currency: selected?.currency ?? 'USD', priceMinor, values, choices }));
  };

  return (
    // React change events bubble, so this one handler hears every input, select, and checkbox below,
    // DisclosureChoices included. New controls must stay native inputs inside this form to be covered.
    <form onChange={onEdit} onSubmit={submit}>
      <Stack gap={6}>
        <ExpensePicker expenses={expenses} onSelect={selectExpense} selected={selected} />
        <ScopeDetailsFields onChange={changeValues} values={values} />
        <PriceFields onChange={changeValues} priceError={validationError ? 'Not a dollar amount.' : null} values={values} />
        <DisclosureChoices
          choices={choices}
          incumbentVendorName={values.incumbentVendorName}
          onChange={setChoices}
          onIncumbentVendorNameChange={(name) => changeValues({ incumbentVendorName: name })}
        />

        <Stack gap={3}>
          {validationError ? <Callout role="alert" title="Check the current price" tone="danger">{validationError}</Callout> : null}
          {errorMessage ? <ErrorState error={null} title={errorMessage} /> : null}
          <Cluster gap={3} justify="start">
            {/* Re-drafting while a publish is on the wire would race it on the server. */}
            <Button disabled={isPublishing || !expenseId} isBusy={isSubmitting} size="lg" type="submit" variant={hasFreshPreview ? 'secondary' : 'primary'}>
              {isSubmitting ? 'Preparing preview…' : 'Preview exactly what goes public'}
            </Button>
            <span className="ui-text-muted ui-text-sm">Previewing publishes nothing. It saves a private draft and shows you the payload.</span>
          </Cluster>
        </Stack>
      </Stack>
    </form>
  );
}
