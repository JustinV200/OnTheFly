/* The portfolio headline of Spend: eligible annual spend as the biggest number, then compact private, public, and
   data-source tiles. Expenses the server marks ineligible (payroll, taxes, transfers) stay out of the headline and are
   named in its caption instead. Totals only add like currencies; a second currency is listed beside the first, never
   converted. The sums are display aggregation over server amounts, not a new money calculation. */
import type { ReactNode } from 'react';

import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Icon, IconName, Stat } from '../../../shared/ui';
import { sourceLabel } from '../connection/describe/sourceLabel';
import type { ImportedSource } from '../connection/types';
import type { Expense } from '../types';
import { expenseVisibility } from '../visibility/expenseVisibility';
import { WholeAmount } from './WholeAmount';
import './SpendOverview.css';

interface SpendOverviewProps {
  expenses: Expense[];
  // Stored transactions per provider, from the connection status; names the data-source tile.
  sources: ImportedSource[];
}

/** Render the eligible-spend headline with its provenance and the three summary tiles. */
export function SpendOverview({ expenses, sources }: SpendOverviewProps): JSX.Element {
  const eligible = expenses.filter((expense) => expense.is_eligible);
  const excluded = expenses.filter((expense) => !expense.is_eligible);
  // Live listings only: an accepted REBID is off the markets even though its expense still reads public.
  const publicCount = expenses.filter((expense) => expenseVisibility(expense) === 'public').length;
  // An accepted REBID was published and is now off the markets: it is neither live nor "not published".
  const privateCount = expenses.filter((expense) => !['public', 'accepted'].includes(expenseVisibility(expense))).length;
  const provenance = Array.from(new Set(expenses.flatMap((expense) => expense.provenance))).sort();
  const sourceNames = Array.from(new Set(sources.map((source) => sourceLabel(source.provider, source.source_type))));

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
            {provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
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
        <Tile isWide>
          <Stat
            caption="Details under Data sources"
            label={<IconLabel icon="info">Data source</IconLabel>}
            size="md"
            value={<span className="spend-overview__source">{sourceNames.length > 0 ? sourceNames.join(' + ') : 'None imported'}</span>}
          />
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

function Tile({ isWide = false, children }: { isWide?: boolean; children: ReactNode }): JSX.Element {
  return <div className={isWide ? 'spend-overview__tile spend-overview__tile--wide' : 'spend-overview__tile'}>{children}</div>;
}

function IconLabel({ icon, children }: { icon: IconName; children: ReactNode }): JSX.Element {
  return (
    <span className="spend-overview__label">
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}
