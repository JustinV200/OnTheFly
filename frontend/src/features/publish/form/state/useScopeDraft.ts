/* Holds the publish form's draft across the Scope, Preview and Publish steps: the chosen expense, the scope answers,
   and the disclosure choices. It lives above the steps so Back never loses what the owner typed.
   Every change goes through here and calls onEdit in the same update, so a preview of old values can never be published. */
import { useEffect, useState } from 'react';

import { formatMinorForInput } from '../../../../shared/format/formatMinorForInput';
import type { PublishableExpense, PublishChoices } from '../../types';
import { categoryFieldSet, CategoryFieldSet } from '../template/categoryFieldSet';
import { applyDemoTemplate } from '../template/demoTemplate';
import { EMPTY_SCOPE_FORM_VALUES, ScopeFormValues } from './scopeFormValues';

// Private by default: sealed bidding, no vendor name, no address (CLAUDE.md, "Visibility").
const DEFAULT_CHOICES: PublishChoices = { bidding_mode: 'sealed', show_exact_address: false, show_incumbent_vendor: false };

export interface ScopeDraft {
  selectedExpense: PublishableExpense | undefined;
  values: ScopeFormValues;
  choices: PublishChoices;
  fieldSet: CategoryFieldSet;
  selectExpense: (expense: PublishableExpense) => void;
  changeValues: (patch: Partial<ScopeFormValues>) => void;
  changeChoices: (choices: PublishChoices) => void;
  fillDemoTemplate: () => void;
}

/** Keep the draft for the given publishable expenses, starting on initialExpenseId when it is one of them.
    onEdit is the publish hook's invalidatePreview. */
export function useScopeDraft(expenses: PublishableExpense[], initialExpenseId: string | null, onEdit: () => void): ScopeDraft {
  const [expenseId, setExpenseId] = useState<string>('');
  const [values, setValues] = useState<ScopeFormValues>(EMPTY_SCOPE_FORM_VALUES);
  const [choices, setChoices] = useState<PublishChoices>(DEFAULT_CHOICES);

  const selectedExpense = expenses.find((expense) => expense.id === expenseId);
  const fieldSet = categoryFieldSet(selectedExpense?.category ?? null);

  const selectExpense = (expense: PublishableExpense): void => {
    onEdit();
    setExpenseId(expense.id);
    // Only the transaction baseline is prefilled, for the owner to confirm or correct (roadmap 11, "Remove silent
    // defaults"). The server publishes this price and cadence as a pair. Scope answers the owner typed are kept.
    setValues((current) => ({ ...current, currentPrice: formatMinorForInput(expense.amount_minor_per_period), billingCadence: expense.cadence }));
  };

  // Expenses load asynchronously; select the one the dashboard linked to, else the first.
  useEffect(() => {
    if (!expenseId && expenses.length > 0) {
      selectExpense(expenses.find((expense) => expense.id === initialExpenseId) ?? expenses[0]);
    }
    // selectExpense is recreated each render, so it isn't a dependency; the !expenseId guard makes this run once.
  }, [expenses, expenseId, initialExpenseId]);

  return {
    selectedExpense,
    values,
    choices,
    fieldSet,
    selectExpense,
    changeValues: (patch) => {
      onEdit();
      setValues((current) => ({ ...current, ...patch }));
    },
    changeChoices: (next) => {
      onEdit();
      setChoices(next);
    },
    fillDemoTemplate: () => {
      onEdit();
      setValues((current) => applyDemoTemplate(current, fieldSet));
    },
  };
}
