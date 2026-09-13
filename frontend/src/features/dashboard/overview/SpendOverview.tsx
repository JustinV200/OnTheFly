/* The portfolio headline of Spend: eligible annual spend as the biggest number, then compact private and public tiles.
   Expenses the server marks ineligible (payroll, taxes, transfers) stay out of the headline and are named in its caption
   instead. Totals only add like currencies; a second currency is listed beside the first, never converted. The sums are
   display aggregation over server amounts, not a new money calculation.
   Provenance is deliberately absent here: the page states it once, on the expense list's header, and the Data sources
   card below holds the detail. */
import type { ReactNode } from 'react';

import { Icon, IconName, Stat } from '../../../shared/ui';
import type { Expense } from '../types';
import { expenseVisibility } from '../visibility/expenseVisibility';
import { WholeAmount } from './WholeAmount';
import './SpendOverview.css';

interface SpendOverviewProps {
  expenses: Expense[];
}

/** Render the eligible-spend headline and the private and public tiles. */
export function SpendOverview({ expenses }: SpendOverviewProps): JSX.Element {
  const eligible = expenses.filter((expense) => expense.is_eligible);
  const excluded = expenses.filter((expense) => !expense.is_eligible);
  // Live listings only: an accepted REBID is off the markets even though its expense still reads public.
  const publicCount = expenses.filter((expense) => expenseVisibility(expense) === 'public').length;
  // An accepted REBID was published and is now off the markets: it is neither live nor "not published".
  const privateCount = expenses.filter((expense) => !['public', 'accepted'].includes(expenseVisibility(expense))).length;

  return (
    <section aria-label="Spend summary" className="spend-overview">
      <Stat
        caption={
          <>
            <span>Across {eligible.length} {eligible.length === 1 ? 'expense' : 'expenses'}</span>
            {excluded.length > 0 ? (
              <span>
                Excludes <CurrencyTotals expenses={excluded} /> / year that can’t be listed (payroll, taxes, transfers, or
                marked ineligible)
              </span>
            ) : null}
          </>
        }
        label="Eligible annual spend"
        size="xl"
        unit="/ year"
        value={eligible.length > 0 ? <CurrencyTotals expenses={eligible} /> : 'None'}
      />

      <div className="spend-overview__tiles">
        <Tile>
          <Stat caption="Not published" label={<IconLabel icon="lock">Private</IconLabel>} size="md" value={privateCount} />
        </Tile>
        <Tile>
          <Stat caption="Live listings" label={<IconLabel icon="globe">Public</IconLabel>} size="md" value={publicCount} />
        </Tile>
      </div>
    </section>
  );
}

// Annualized totals per currency, joined with "+" rather than converted.
function CurrencyTotals({ expenses }: { expenses: Expense[] }): JSX.Element {
  const totalsByCurrency = expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.annualized_amount_minor;
    return totals;
  }, {});

  return (
    <>
      {Object.entries(totalsByCurrency).map(([currency, total], index) => (
        <span key={currency}>
          {index > 0 ? ' + ' : null}
          <WholeAmount amountMinor={total} currency={currency} />
        </span>
      ))}
    </>
  );
}

function Tile({ children }: { children: ReactNode }): JSX.Element {
  return <div className="spend-overview__tile">{children}</div>;
}

function IconLabel({ icon, children }: { icon: IconName; children: ReactNode }): JSX.Element {
  return (
    <span className="spend-overview__label">
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}
