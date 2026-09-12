/* Renders one potential-savings figure with its provisional flag and assumptions.
   Assumptions are listed rather than hidden: a scope gap or unknown cost changes what the number means. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { SavingsResponse } from './types';

interface SavingsCellProps {
  savings: SavingsResponse;
  currency: string;
}

/** Render first-year potential savings, marked provisional with each assumption listed. */
export function SavingsCell({ savings, currency }: SavingsCellProps): JSX.Element {
  return (
    <div>
      {savings.label}: <MoneyDisplay amountMinor={savings.first_year_net_savings_minor} currency={currency} />
      {savings.is_provisional ? ' (provisional)' : null}
      {savings.assumptions.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
          {savings.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
