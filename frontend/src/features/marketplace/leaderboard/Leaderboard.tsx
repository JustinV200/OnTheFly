/* Loads a public listing's anonymized offers and picks the view for its bidding mode.
   Sealed listings show only a count. Open listings rank published prices by scope completeness before price.
   Sealed-at-submission offers are counted but never priced, even after the owner opens bidding. */
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Card } from '../../../shared/ui';
import { OpenLeaderboard } from './OpenLeaderboard';
import { SealedOfferCount } from './SealedOfferCount';
import { useLeaderboard } from './useLeaderboard';

interface LeaderboardProps {
  listingId: string;
}

/** Render the offers section for one public listing, polling for new offers. */
export function Leaderboard({ listingId }: LeaderboardProps): JSX.Element {
  const board = useLeaderboard(listingId);

  if (!board.data) {
    return (
      <Card title="Offers">
        {board.error
          ? <ErrorState error={board.error} onRetry={board.reload} title="Leaderboard unavailable" />
          : <LoadingSpinner label="Loading offers…" />}
      </Card>
    );
  }

  // A failed poll leaves the last prices on screen; say so, since an underbid may have landed since.
  const staleNotice = board.error
    ? <ErrorState error={board.error} onRetry={board.reload} title="Showing the last loaded offers; a refresh failed" />
    : null;

  // Anything but an explicit "open" is treated as sealed, so an unset or unexpected mode never exposes prices.
  return board.data.bidding_mode === 'open'
    ? <OpenLeaderboard board={board.data} staleNotice={staleNotice} />
    : <SealedOfferCount staleNotice={staleNotice} totalCount={board.data.total_offer_count} />;
}
