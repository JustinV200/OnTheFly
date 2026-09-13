/* Renders the side-by-side comparison rows including the incumbent baseline.
   Rows arrive ranked by scope completeness before price, each offer against the scope version it answered, and each figure carries its origin.
   Read on phones too, so below 640px each row becomes a labelled card. */
import { Fragment } from 'react';

import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { Pill } from '../../../shared/components/Pill';
import { answeredScopeLabel } from '../../../shared/offers/answeredScopeLabel';
import { OfferGroupHeadingRow } from '../../../shared/offers/OfferGroupHeadingRow';
import { groupHeadingBefore } from '../../../shared/offers/offerGroups';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Cluster, Table } from '../../../shared/ui';
import { OfferSavings } from '../savings/OfferSavings';
import type { ComparisonRow } from '../types';
import './ComparisonView.css';

interface ComparisonViewProps {
  rows: ComparisonRow[];
  currentScopeVersionNumber: number;
}

/** Render the owner comparison table with baseline and challengers. */
export function ComparisonView({ rows, currentScopeVersionNumber }: ComparisonViewProps): JSX.Element {
  return (
    <section aria-labelledby="inbox-comparison-heading" className="inbox-comparison">
      <div>
        <h2 className="inbox-comparison__title" id="inbox-comparison-heading">Comparison against what you pay now</h2>
        <p className="ui-text-sm ui-text-muted">
          Every price is restated per month. Offers covering more of your scope rank above cheaper ones that cover less. Offers made on
          an earlier version of your scope are listed after, scored against the scope and price they answered.
        </p>
      </div>
      <Table className="inbox-comparison__table" label="Comparison against what you pay now" layout="stack" minWidth="720px">
        <thead>
          <tr>
            <th>Offer or baseline</th>
            <th className="ui-num">Monthly</th>
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
                <tr className={row.is_incumbent ? 'inbox-comparison__baseline' : undefined}>
                  <td className="inbox-comparison__block-cell" data-label="Offer or baseline">
                    <div className="inbox-comparison__name">{row.is_incumbent ? 'What you pay now' : row.challenger_name}</div>
                    {/* The baseline isn't an offer, so it gets its origin in words rather than an "offer:" badge. */}
                    <Cluster className="inbox-comparison__badges" gap={1}>
                      {row.is_incumbent
                        ? <span className="ui-text-sm ui-text-muted">your confirmed current price</span>
                        : <ProvenanceBadge kind="offer" value={row.provenance} />}
                      {isEarlierScope ? (
                        <Pill tone="warning">{answeredScopeLabel(row.answered_scope_version_number, currentScopeVersionNumber)}</Pill>
                      ) : null}
                    </Cluster>
                  </td>
                  <td className="ui-num" data-label="Monthly">
                    <MoneyDisplay amountMinor={row.normalized_price_minor} currency={row.price_currency} />
                  </td>
                  <td data-label="Scope covered">
                    {row.is_incumbent
                      ? 'baseline'
                      : `${Math.round(row.scope_completeness * 100)}%${isEarlierScope ? ` of v${row.answered_scope_version_number}` : ''}`}
                  </td>
                  {/* An offer's savings cell opens with its own savings label, so the phone layout doesn't repeat the column name. */}
                  <td
                    className={row.is_incumbent ? 'inbox-comparison__block-cell' : 'inbox-comparison__block-cell inbox-comparison__self-labelled'}
                    data-label="Potential savings"
                  >
                    {row.is_incumbent
                      ? <><span aria-hidden="true">—</span><span className="ui-visually-hidden">Not applicable to the baseline</span></>
                      : <OfferSavings offer={row} />}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </Table>
    </section>
  );
}
