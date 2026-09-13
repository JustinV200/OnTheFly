/* The open-bidding leaderboard table: rank, the server's per-month price, and scope covered side by side, then time and
   origin. The price column says "compared per month" because the listing itself may be priced on another period.
   There is no identity column and none may be added: bidders are anonymous to each other in every mode.
   Offers on an earlier scope version, or in another currency, sit in their own labelled groups and get no rank number. */
import { Fragment } from 'react';

import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { answeredScopeLabel } from '../../../shared/offers/answeredScopeLabel';
import { OfferGroupHeadingRow } from '../../../shared/offers/OfferGroupHeadingRow';
import { groupHeadingBefore } from '../../../shared/offers/offerGroups';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Table } from '../../../shared/ui';
import type { LeaderboardEntry } from '../types';
import { ScopeCompleteness } from './ScopeCompleteness';
import './LeaderboardTable.css';

const COLUMN_COUNT = 5;

interface LeaderboardTableProps {
  // Already ordered by the server (scope completeness, then price); this component never re-sorts.
  entries: LeaderboardEntry[];
  currentScopeVersion: number;
}

/** Render the priced, anonymized offers as a table that becomes labelled cards on a phone. */
export function LeaderboardTable({ entries, currentScopeVersion }: LeaderboardTableProps): JSX.Element {
  return (
    <Table label="Open bidding leaderboard" layout="stack" minWidth="640px">
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th className="ui-num" scope="col">Price, compared per month</th>
          <th scope="col">Scope covered</th>
          <th scope="col">Submitted</th>
          <th scope="col">Origin</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => {
          const heading = groupHeadingBefore(entries, index);
          // The current-scope group always comes first, so its position is its rank; other groups aren't ranked against it.
          const isRanked = entry.is_current_scope_version && entry.unranked_reason === null;
          return (
            <Fragment key={entry.challenge_id}>
              {heading ? <OfferGroupHeadingRow colSpan={COLUMN_COUNT} group={heading} /> : null}
              <tr>
                <td className="leaderboard-table__rank" data-label="Rank">
                  {isRanked ? `#${index + 1}` : (
                    <>
                      <span aria-hidden="true">—</span>
                      <span className="ui-visually-hidden">Not ranked</span>
                    </>
                  )}
                </td>
                <td className="ui-num leaderboard-table__price" data-label="Price, compared per month">
                  <MoneyDisplay amountMinor={entry.normalized_price_minor} currency={entry.price_currency} />
                </td>
                <td data-label="Scope covered">
                  <ScopeCompleteness score={entry.scope_completeness} />
                  {entry.is_current_scope_version ? null : (
                    <div className="ui-text-muted ui-text-sm">
                      {answeredScopeLabel(entry.answered_scope_version_number, currentScopeVersion)}
                    </div>
                  )}
                </td>
                <td className="ui-text-sm" data-label="Submitted">{formatTimestamp(entry.submitted_at)}</td>
                <td data-label="Origin">
                  <ProvenanceBadge kind="offer" value={entry.provenance} />
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}
