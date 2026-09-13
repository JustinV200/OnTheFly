/* The owner's table of every offer on one listing, in the order the server ranked them.
   Group heading rows mark where offers on an earlier scope version, or unranked ones, begin; nothing is re-sorted here. */
import { Fragment } from 'react';

import { OfferGroupHeadingRow } from '../../../shared/offers/OfferGroupHeadingRow';
import { groupHeadingBefore } from '../../../shared/offers/offerGroups';
import { Table } from '../../../shared/ui';
import type { InboxChallenge } from '../types';
import { ChallengeRow, CHALLENGE_ROW_COLUMN_COUNT } from './ChallengeRow';
import './OffersTable.css';

interface OffersTableProps {
  challenges: InboxChallenge[];
  currentScopeVersionNumber: number;
}

/** Render the offers section: heading, the potential-savings caveat, and one row pair per offer. */
export function OffersTable({ challenges, currentScopeVersionNumber }: OffersTableProps): JSX.Element {
  return (
    <section aria-labelledby="inbox-offers-heading" className="inbox-offers">
      <div className="inbox-offers__header">
        <h2 className="inbox-offers__title" id="inbox-offers-heading">Offers</h2>
        <p className="ui-text-sm ui-text-muted">
          Scope differences come before price: an offer that covers less of your scope is not cheaper. Savings are potential until you
          actually switch providers.
        </p>
      </div>
      {/* Owner-dense and read at a desk, so it scrolls sideways inside its own frame on a phone rather than stacking. */}
      <Table className="inbox-offers__table" label="Offers on this listing" minWidth="880px">
        <thead>
          <tr>
            <th>Challenger (visible only to you)</th>
            <th>Scope differences</th>
            <th className="ui-num">Price</th>
            <th>Potential savings</th>
          </tr>
        </thead>
        <tbody>
          {challenges.map((challenge, index) => {
            // Rows arrive grouped by the server; a heading marks where offers on an earlier scope, or unranked ones, begin.
            const heading = groupHeadingBefore(challenges, index);
            return (
              <Fragment key={challenge.challenge_id}>
                {heading ? <OfferGroupHeadingRow colSpan={CHALLENGE_ROW_COLUMN_COUNT} group={heading} /> : null}
                <ChallengeRow challenge={challenge} currentScopeVersionNumber={currentScopeVersionNumber} />
              </Fragment>
            );
          })}
        </tbody>
      </Table>
    </section>
  );
}
