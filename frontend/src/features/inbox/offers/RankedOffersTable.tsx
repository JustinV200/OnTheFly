/* The owner's one ranked list for a listing: "What you pay now" pinned first, then every offer in the server's rank
   order (scope covered first, then price compared per month), with a heading row where offers on an earlier scope or
   unranked offers begin. Prices show in the period they are billed on. Nothing is re-sorted or recomputed here.
   Below 640px each row becomes a card. */
import { Fragment } from 'react';

import { OfferGroupHeadingRow } from '../../../shared/offers/OfferGroupHeadingRow';
import { groupHeadingBefore } from '../../../shared/offers/offerGroups';
import { Table } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { ComparisonRow, InboxChallenge, OwnerChallenge } from '../types';
import { offerRanks } from './offerRanks';
import { BaselineRow } from './rows/BaselineRow';
import { OfferRow } from './rows/OfferRow';
import './RankedOffersTable.css';

// Challenger, scope, price, savings, evidence, details: what group heading rows span.
const COLUMN_COUNT = 6;

interface RankedOffersTableProps {
  listing: PublicListingProjection;
  offers: InboxChallenge[];
  // Every offer's terms as submitted (owner-only), matched to rows by id; empty while they load.
  offerTerms: OwnerChallenge[];
  currentScopeVersionNumber: number;
  incumbent: ComparisonRow | null;
  isIncumbentFailed: boolean;
  onOpenOffer: (challengeId: string) => void;
}

/** Render the baseline row and the ranked offers. */
export function RankedOffersTable({ listing, offers, offerTerms, currentScopeVersionNumber, incumbent, isIncumbentFailed, onOpenOffer }: RankedOffersTableProps): JSX.Element {
  const ranks = offerRanks(offers);
  const termsById = new Map(offerTerms.map((terms) => [terms.id, terms]));
  return (
    <Table className="ranked-offers" label="Offers ranked against what you pay now" layout="stack" minWidth="960px">
      <thead>
        <tr>
          <th className="ranked-offers__col-challenger">Challenger · only you see names</th>
          <th className="ranked-offers__col-scope">Scope covered</th>
          <th className="ranked-offers__col-price ui-num">Price</th>
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
              <OfferRow
                currentScopeVersionNumber={currentScopeVersionNumber}
                listingCadence={listing.billing_cadence}
                offer={offer}
                onOpen={onOpenOffer}
                rank={ranks[index]}
                terms={termsById.get(offer.challenge_id) ?? null}
              />
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}
