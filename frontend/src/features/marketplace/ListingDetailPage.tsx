/* A market page: one public listing as any visitor sees it. Header and price, the offer activity, tabs for scope,
   leaderboard and rules, and a sticky ticket with the one action. An unpublished listing gets a defined "isn't public"
   page, not a spinner. The leaderboard is fetched once here and shared by everything that shows offers. */
import { useParams } from 'react-router-dom';

import { useApiQuery } from '../../shared/api/useApiQuery';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { describeDeadline } from '../../shared/format/describeDeadline';
import { describeClosesIn } from '../../shared/market';
import { Stack } from '../../shared/ui';
import { OfferActivity } from './detail/activity/OfferActivity';
import { ChallengePanel } from './detail/ChallengePanel';
import { MarketHeader } from './detail/header/MarketHeader';
import { PriceHeadline } from './detail/header/PriceHeadline';
import { ListingNotPublic } from './detail/ListingNotPublic';
import { MarketTabs } from './detail/tabs/MarketTabs';
import { useLeaderboard } from './leaderboard/useLeaderboard';
import { SimilarListings } from './similar/SimilarListings';
import type { MarketplaceListing } from './types';
import './ListingDetailPage.css';

const POLL_INTERVAL_MS = 10000;

/** Render one market page fetched by listing ID. */
export function ListingDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const query = useApiQuery<MarketplaceListing>(`/api/marketplace/${id}`, { pollIntervalMs: POLL_INTERVAL_MS });
  const isNotPublic = query.error?.status === 404;
  // Stops polling offers once the listing is known to be private: its prices went dark with it.
  const board = useLeaderboard(isNotPublic ? null : id);

  if (isNotPublic) {
    return <ListingNotPublic />;
  }
  if (!query.data) {
    return query.error
      ? <ErrorState error={query.error} onRetry={query.reload} title="Couldn’t load this listing" />
      : <LoadingSpinner label="Loading market…" />;
  }

  const { listing, challenge_count: offerCount } = query.data;
  const closes = describeClosesIn(listing.challenge_deadline);

  return (
    <Stack gap={10}>
      {/* A failed poll keeps the last listing visible, but never silently: its price or terms may have changed. */}
      {query.error ? (
        <ErrorState error={query.error} onRetry={query.reload} title="Showing the last loaded listing; a refresh failed" />
      ) : null}

      <div className="market-page">
        <MarketHeader className="market-page__header" closes={closes} listing={listing} offerCount={offerCount} />
        <PriceHeadline className="market-page__price" listing={listing} />
        <aside aria-label="Bid on this task" className="market-page__ticket">
          <ChallengePanel deadline={describeDeadline(listing.challenge_deadline)} listing={listing} />
        </aside>
        <OfferActivity board={board} className="market-page__activity" listing={listing} offerCount={offerCount} />
        <MarketTabs board={board} className="market-page__tabs" closes={closes} listing={listing} />
      </div>

      <SimilarListings listingId={listing.id} />
    </Stack>
  );
}
