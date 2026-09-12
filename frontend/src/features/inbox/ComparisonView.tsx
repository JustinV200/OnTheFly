/* Renders the side-by-side comparison rows including the incumbent baseline.
   Rows arrive ranked by scope completeness before price, each offer against the scope version it answered, and each figure carries its origin. */
import { Fragment } from 'react';

import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { Pill } from '../../shared/components/Pill';
import { answeredScopeLabel } from '../../shared/offers/answeredScopeLabel';
import { OfferGroupHeadingRow } from '../../shared/offers/OfferGroupHeadingRow';
import { groupHeadingBefore } from '../../shared/offers/offerGroups';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import { OfferSavings } from './offers/OfferSavings';
import type { ComparisonRow } from './types';

interface ComparisonViewProps {
  rows: ComparisonRow[];
  currentScopeVersionNumber: number;
}

/** Render the owner comparison table with baseline and challengers. */
export function ComparisonView({ rows, currentScopeVersionNumber }: ComparisonViewProps): JSX.Element {
  return (
    <section style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '0.25rem' }}>Comparison against what you pay now</h3>
      <p style={{ color: '#475569', marginTop: 0 }}>
        Every price is restated per month. Offers covering more of your scope rank above cheaper ones that cover less. Offers made on
        an earlier version of your scope are listed after, scored against the scope and price they answered.
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
            {rows.map((row, index) => {
              const heading = groupHeadingBefore(rows, index);
              const isEarlierScope = !row.is_incumbent && !row.is_current_scope_version;
              return (
                <Fragment key={row.challenge_id ?? 'incumbent'}>
                  {heading ? <OfferGroupHeadingRow colSpan={4} group={heading} /> : null}
                  <tr style={{ backgroundColor: row.is_incumbent ? '#f8fafc' : undefined, borderTop: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                    <td style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>
                      <strong>{row.is_incumbent ? 'What you pay now' : row.challenger_name}</strong>
                      {/* The baseline isn't an offer, so it gets its origin in words rather than an "offer:" badge. */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {row.is_incumbent
                          ? <span style={{ color: '#475569', fontSize: '0.85rem' }}>your confirmed current price</span>
                          : <ProvenanceBadge kind="offer" value={row.provenance} />}
                        {isEarlierScope ? (
                          <Pill tone="warning">{answeredScopeLabel(row.answered_scope_version_number, currentScopeVersionNumber)}</Pill>
                        ) : null}
                      </div>
                    </td>
                    <td><MoneyDisplay amountMinor={row.normalized_price_minor} currency={row.price_currency} /></td>
                    <td>
                      {row.is_incumbent
                        ? 'baseline'
                        : `${Math.round(row.scope_completeness * 100)}%${isEarlierScope ? ` of v${row.answered_scope_version_number}` : ''}`}
                    </td>
                    <td>{row.is_incumbent ? '—' : <OfferSavings offer={row} />}</td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
