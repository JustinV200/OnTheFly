/* Renders one potential-savings figure with its provisional flag, assumptions, and a link to trace it.
   Assumptions are listed rather than hidden: a scope gap or unknown cost changes what the number means. */
import { Link } from 'react-router-dom';

import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { Badge } from '../../../shared/ui';
import type { SavingsResponse } from '../types';
import { describeAssumption } from './describeAssumption';
import './SavingsCell.css';

interface SavingsCellProps {
  savings: SavingsResponse;
  currency: string;
  // When set, the figure links to the trace from this offer down to individual transactions.
  challengeId?: string;
}

/** Render first-year potential savings, marked provisional with each assumption listed. */
export function SavingsCell({ savings, currency, challengeId }: SavingsCellProps): JSX.Element {
  return (
    <div className="savings-cell">
      {/* The server's label, e.g. "Potential savings (scope gaps)": the qualifier is part of what the figure means. */}
      <div className="savings-cell__label">{savings.label}</div>
      <div className="savings-cell__figure">
        <MoneyDisplay amountMinor={savings.first_year_net_savings_minor} currency={currency} />
        <span className="savings-cell__unit">first year</span>
        {savings.is_provisional ? <Badge tone="warning">Provisional</Badge> : null}
      </div>
      {savings.assumptions.length > 0 ? (
        <ul className="savings-cell__assumptions">
          {savings.assumptions.map((assumption) => <li key={assumption}>{describeAssumption(assumption)}</li>)}
        </ul>
      ) : null}
      {challengeId ? <Link className="savings-cell__trace" to={`/offers/${challengeId}/trace`}>Where does this number come from?</Link> : null}
    </div>
  );
}
