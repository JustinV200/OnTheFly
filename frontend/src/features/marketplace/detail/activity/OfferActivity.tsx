/* The market page's offer panel. Sealed bidding: a count and nothing about prices. Open bidding: the public offers as a
   chart, or an intentional state for no offer or a single one. Reads the page's shared leaderboard query.
   Either listing or leaderboard saying anything but "open" shows the sealed panel, so a mode change mid-poll never
   leaves prices on screen. */
import type { ApiQueryState } from '../../../../shared/api/useApiQuery';
import { Card } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import type { LeaderboardResponse } from '../../types';
import { OpenOffers } from './OpenOffers';
import { SealedOffersPanel } from './SealedOffersPanel';

interface OfferActivityProps {
  listing: PublicListingProjection;
  // The listing detail's own count, shown for a sealed listing until the leaderboard's count arrives.
  offerCount: number;
  board: ApiQueryState<LeaderboardResponse>;
  className?: string;
}

/** Render the offer activity card for one listing. */
export function OfferActivity({ listing, offerCount, board, className }: OfferActivityProps): JSX.Element {
  const isSealed = listing.bidding_mode !== 'open' || (board.data !== null && board.data.bidding_mode !== 'open');

  return (
    <Card className={className} title="Offer activity">
      {isSealed
        ? <SealedOffersPanel offerCount={board.data?.total_offer_count ?? offerCount} />
        : <OpenOffers board={board} listing={listing} />}
    </Card>
  );
}
