/* Renders the side-by-side comparison rows including the incumbent baseline.
   Rows arrive ranked by scope completeness before price, and each figure carries its origin. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import { SavingsCell } from './SavingsCell';
import type { ComparisonRow } from './types';

interface ComparisonViewProps {
  rows: ComparisonRow[];
}

/** Render the owner comparison table with baseline and challengers. */
export function ComparisonView({ rows }: ComparisonViewProps): JSX.Element {
  return (
    <section style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '0.25rem' }}>Comparison against what you pay now</h3>
      <p style={{ color: '#475569', marginTop: 0 }}>
        Every price is restated per month. Offers covering more of your scope rank above cheaper ones that cover less.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '640px', width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Row</th>
              <th>Monthly</th>
              <th>Scope covered</th>
              <th>Potential savings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.challenge_id ?? 'incumbent'} style={{ backgroundColor: row.is_incumbent ? '#f8fafc' : undefined, borderTop: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                <td style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>
                  <strong>{row.is_incumbent ? 'What you pay now' : row.challenger_name}</strong>
                  {/* The baseline isn't an offer, so it gets its origin in words rather than an "offer:" badge. */}
                  <div>
                    {row.is_incumbent
                      ? <span style={{ color: '#475569', fontSize: '0.85rem' }}>your confirmed current price</span>
                      : <ProvenanceBadge kind="offer" value={row.provenance} />}
                  </div>
                </td>
                <td><MoneyDisplay amountMinor={row.normalized_price_minor} currency={row.price_currency} /></td>
                <td>{row.is_incumbent ? 'baseline' : `${Math.round(row.scope_completeness * 100)}%`}</td>
                <td>
                  {row.savings
                    ? <SavingsCell challengeId={row.challenge_id ?? undefined} currency={row.price_currency} savings={row.savings} />
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
