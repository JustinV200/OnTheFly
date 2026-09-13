/* The expense being published, kept in view beside every step: vendor, what the transactions show it costs, and
   where that figure came from. Private context for the owner only; the price that publishes is the one confirmed in Scope.
   The expense can only be switched on the Scope step, since a switch discards any preview. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, Card, Field, Icon, Select, Stack, Stat } from '../../../shared/ui';
import type { PublishableExpense } from '../types';
import './ExpenseSideCard.css';

interface ExpenseSideCardProps {
  expenses: PublishableExpense[];
  selected: PublishableExpense | undefined;
  onSelect: (expense: PublishableExpense) => void;
  isPickerEnabled: boolean;
}

/** Render the side card with the expense picker (Scope step only) and the transaction baseline. */
export function ExpenseSideCard({ expenses, selected, onSelect, isPickerEnabled }: ExpenseSideCardProps): JSX.Element {
  return (
    <Card actions={<Badge icon={<Icon name="lock" />} tone="private">Private</Badge>} as="aside" className="publish-side-card" title="Expense">
      <Stack gap={4}>
        {isPickerEnabled && expenses.length > 1 ? (
          <Field hint="Payroll, taxes, transfers, and anything already public aren’t listed." label="Publishing">
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
        ) : null}
        {selected ? (
          <>
            <div>
              <p className="publish-side-card__vendor">{selected.vendor}</p>
              <p className="publish-side-card__category">{categoryLabel(selected.category)}</p>
            </div>
            <Stat
              caption={(
                <>
                  {selected.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
                  <span>From your transactions</span>
                </>
              )}
              label="You pay now"
              size="lg"
              unit={`/ ${selected.cadence}`}
              value={<MoneyDisplay amountMinor={selected.amount_minor_per_period} currency={selected.currency} />}
            />
          </>
        ) : null}
      </Stack>
    </Card>
  );
}
