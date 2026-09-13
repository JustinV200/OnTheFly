/* The portfolio headline of Spend: tracked annual spend as the biggest number, then compact private, public, and
   data-source tiles. Totals only add like currencies; a second currency is listed beside the first, never converted.
   Counts and totals use the same aggregation the dashboard has always shown; nothing here is a new money calculation. */
import type { ReactNode } from 'react';

import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Icon, IconName, Stat } from '../../../shared/ui';
import { sourceLabel } from '../connection/describe/sourceLabel';
import type { ImportedSource } from '../connection/types';
import type { Expense } from '../types';
import { WholeAmount } from './WholeAmount';
import './SpendOverview.css';

interface SpendOverviewProps {
  expenses: Expense[];
  // Stored transactions per provider, from the connection status; names the data-source tile.
  sources: ImportedSource[];
}

/** Render the tracked-spend headline with its provenance and the three summary tiles. */
export function SpendOverview({ expenses, sources }: SpendOverviewProps): JSX.Element {
  const totalsByCurrency = expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.annualized_amount_minor;
    return totals;
  }, {});
  const publicCount = expenses.filter((expense) => expense.visibility === 'public').length;
  const provenance = Array.from(new Set(expenses.flatMap((expense) => expense.provenance))).sort();
  const sourceNames = Array.from(new Set(sources.map((source) => sourceLabel(source.provider, source.source_type))));

  return (
    <section aria-label="Spend summary" className="spend-overview">
      <Stat
        caption={
          <>
            <span>Across {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}</span>
            {provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}
          </>
        }
        label="Tracked annual spend"
        size="xl"
        unit="/ year"
        value={Object.entries(totalsByCurrency).map(([currency, total], index) => (
          <span key={currency}>
            {index > 0 ? ' + ' : null}
            <WholeAmount amountMinor={total} currency={currency} />
          </span>
        ))}
      />

      <div className="spend-overview__tiles">
        <Tile>
          <Stat caption="Only you can see these" label={<IconLabel icon="lock">Private</IconLabel>} size="md" value={expenses.length - publicCount} />
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
