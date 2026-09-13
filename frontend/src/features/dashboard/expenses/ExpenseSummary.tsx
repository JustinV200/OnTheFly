/* Renders the tracked-spend total and the private / public counts that open the privacy proof.
   Totals only add like currencies; a second currency is listed beside the first, never converted. */
import type { ReactNode } from 'react';

import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Card, Icon, IconName, Stat } from '../../../shared/ui';
import type { Expense } from '../types';
import './ExpenseSummary.css';

interface ExpenseSummaryProps {
  expenses: Expense[];
}

/** Render total annualized spend with its provenance, then how many expenses are private and public. */
export function ExpenseSummary({ expenses }: ExpenseSummaryProps): JSX.Element {
  const totalsByCurrency = expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.annualized_amount_minor;
    return totals;
  }, {});
  const publicCount = expenses.filter((expense) => expense.visibility === 'public').length;
  const provenance = Array.from(new Set(expenses.flatMap((expense) => expense.provenance))).sort();

  return (
    <Card label="Spend summary">
      <div className="expense-summary">
        <Stat
          caption={
            <>
              <span>Across {expenses.length} expense groups</span>
              {provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
            </>
          }
          label="Tracked spend"
          size="xl"
          unit="/ year"
          value={Object.entries(totalsByCurrency).map(([currency, total], index) => (
            <span key={currency}>
              {index > 0 ? ' + ' : null}
              <MoneyDisplay amountMinor={total} currency={currency} />
            </span>
          ))}
        />
        <Stat caption="Only you can see these." label={<IconLabel icon="lock">Private</IconLabel>} value={expenses.length - publicCount} />
        <Stat
          caption="Visible on your public profile and in the marketplace."
          label={<IconLabel icon="eye">Public</IconLabel>}
          value={publicCount}
        />
      </div>
    </Card>
  );
}

function IconLabel({ icon, children }: { icon: IconName; children: ReactNode }): JSX.Element {
  return (
    <span className="expense-summary__label">
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}
