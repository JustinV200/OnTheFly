/* Renders one potential-savings figure with its provisional flag, assumptions, and a link to trace it.
   Assumptions are listed rather than hidden: a scope gap or unknown cost changes what the number means. */
import { Link } from 'react-router-dom';

import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { SavingsResponse } from './types';

interface SavingsCellProps {
  savings: SavingsResponse;
  currency: string;
  // When set, the figure links to the trace from this offer down to individual transactions.
  challengeId?: string;
}

/** Render first-year potential savings, marked provisional with each assumption listed. */
export function SavingsCell({ savings, currency, challengeId }: SavingsCellProps): JSX.Element {
  return (
    <div>
      {savings.label}: <strong><MoneyDisplay amountMinor={savings.first_year_net_savings_minor} currency={currency} /></strong> first year
      {savings.is_provisional ? ' (provisional)' : null}
      {savings.assumptions.length > 0 ? (
        <ul style={{ fontSize: '0.85rem', margin: 0, paddingLeft: '1.2em' }}>
          {savings.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      ) : null}
      {challengeId ? <Link to={`/offers/${challengeId}/trace`}>Where does this number come from?</Link> : null}
    </div>
  );
}
