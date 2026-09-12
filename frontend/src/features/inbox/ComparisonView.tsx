/* Renders the side-by-side comparison rows including the incumbent baseline. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { ComparisonRow } from './types';

interface ComparisonViewProps {
  rows: ComparisonRow[];
}

/** Render the owner comparison table with baseline and challengers. */
export function ComparisonView({ rows }: ComparisonViewProps): JSX.Element {
  return (
    <section>
      <h3>Comparison</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th align="left">Row</th>
            <th align="left">Normalized monthly</th>
            <th align="left">Scope completeness</th>
            <th align="left">Potential savings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.challenge_id ?? 'incumbent'}>
              <td>{row.challenger_name}{row.is_incumbent ? ' (baseline)' : ''}</td>
              <td><MoneyDisplay amountMinor={row.normalized_price_minor} currency={row.price_currency} /></td>
              <td>{Math.round(row.scope_completeness * 100)}%</td>
              <td>{row.savings ? <MoneyDisplay amountMinor={row.savings.first_year_net_savings_minor} currency={row.price_currency} /> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
