/* Picks which expense to publish and shows its transaction baseline, with where that figure came from.
   The baseline is private context for the owner; the price that publishes is the one confirmed further down. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../../shared/format/categoryLabel';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Field, Grid, Select, Stat } from '../../../../shared/ui';
import type { PublishableExpense } from '../../types';
import { FormSection } from '../FormSection';

interface ExpensePickerProps {
  expenses: PublishableExpense[];
  selected: PublishableExpense | undefined;
  onSelect: (expense: PublishableExpense) => void;
}

/** Render the expense select beside the selected expense's "Currently pays" baseline. */
export function ExpensePicker({ expenses, selected, onSelect }: ExpensePickerProps): JSX.Element {
  return (
    <FormSection
      description="Only expenses you can publish are listed. Payroll, taxes, transfers, and anything already public are not."
      title="Which expense"
    >
      <Grid gap={5} minItemWidth="240px">
        <Field hint={selected ? categoryLabel(selected.category) : undefined} label="Expense">
          <Select
            onChange={(event) => {
              const expense = expenses.find((candidate) => candidate.id === event.target.value);
              if (expense) {
                onSelect(expense);
              }
            }}
            value={selected?.id ?? ''}
          >
            {expenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.vendor}</option>)}
          </Select>
        </Field>
        {selected ? (
          <Stat
            caption={
              <>
                {selected.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
                <span>From your transactions. Private.</span>
              </>
            }
            label="Currently pays"
            size="lg"
            unit={`/ ${selected.cadence}`}
            value={<MoneyDisplay amountMinor={selected.amount_minor_per_period} currency={selected.currency} />}
          />
        ) : null}
      </Grid>
    </FormSection>
  );
}
