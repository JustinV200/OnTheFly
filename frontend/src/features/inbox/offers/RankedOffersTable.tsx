/* The owner's one ranked list for a listing: "What you pay now" pinned first, then every offer in the server's rank
   order (scope covered first, then price), with a heading row where offers on an earlier scope or unranked offers begin.
   Nothing is re-sorted or recomputed here. Below 640px each row becomes a card. */
import { Fragment } from 'react';

import { OfferGroupHeadingRow } from '../../../shared/offers/OfferGroupHeadingRow';
import { groupHeadingBefore } from '../../../shared/offers/offerGroups';
import { Table } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { ComparisonRow, InboxChallenge } from '../types';
import { BaselineRow } from './BaselineRow';
import { offerRanks } from './offerRanks';
import { OfferRow } from './OfferRow';
import './RankedOffersTable.css';

// Challenger, scope, monthly, savings, evidence, details: what group heading rows span.
const COLUMN_COUNT = 6;

interface RankedOffersTableProps {
  listing: PublicListingProjection;
  offers: InboxChallenge[];
  currentScopeVersionNumber: number;
  incumbent: ComparisonRow | null;
  isIncumbentFailed: boolean;
  onOpenOffer: (challengeId: string) => void;
}

/** Render the baseline row and the ranked offers. */
export function RankedOffersTable({ listing, offers, currentScopeVersionNumber, incumbent, isIncumbentFailed, onOpenOffer }: RankedOffersTableProps): JSX.Element {
  const ranks = offerRanks(offers);
  return (
    <Table className="ranked-offers" label="Offers ranked against what you pay now" layout="stack" minWidth="960px">
      <thead>
        <tr>
          <th className="ranked-offers__col-challenger">Challenger · only you see names</th>
          <th className="ranked-offers__col-scope">Scope covered</th>
          <th className="ranked-offers__col-monthly ui-num">Monthly</th>
          <th className="ranked-offers__col-savings">Potential savings</th>
          <th className="ranked-offers__col-evidence">Evidence</th>
          <th><span className="ui-visually-hidden">Details</span></th>
        </tr>
      </thead>
      <tbody>
        <BaselineRow
          currentScopeVersionNumber={currentScopeVersionNumber}
          incumbent={incumbent}
          isFailed={isIncumbentFailed}
          listing={listing}
        />
        {offers.map((offer, index) => {
          const heading = groupHeadingBefore(offers, index);
          return (
            <Fragment key={offer.challenge_id}>
              {heading ? <OfferGroupHeadingRow colSpan={COLUMN_COUNT} group={heading} /> : null}
              <OfferRow currentScopeVersionNumber={currentScopeVersionNumber} offer={offer} onOpen={onOpenOffer} rank={ranks[index]} />
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}
