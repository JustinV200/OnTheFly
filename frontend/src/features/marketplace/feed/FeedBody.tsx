/* Renders the marketplace feed's state: loading, failed, empty, or the grid of listing cards.
   A failed background poll keeps the last listings on screen but says they may be stale. */
import type { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { describeClosesIn, MarketCard } from '../../../shared/market';
import { ButtonLink, Stack } from '../../../shared/ui';
import type { MarketplaceFeedResponse } from '../types';
import './FeedBody.css';

interface FeedBodyProps {
  // The selected category key, or '' for all categories.
  category: string;
  feed: ApiQueryState<MarketplaceFeedResponse>;
}

/** Render the feed for the current category filter, with every non-happy state spelled out. */
export function FeedBody({ category, feed }: FeedBodyProps): JSX.Element {
  if (!feed.data) {
    return feed.error
      ? <ErrorState error={feed.error} onRetry={feed.reload} title="Couldn’t load the marketplace" />
      : <LoadingSpinner label="Loading public listings…" />;
  }
  if (feed.data.listings.length === 0) {
    return (
      <EmptyState title={category ? `No public listings in ${categoryLabel(category)} yet` : 'No public listings yet'}>
        A listing appears here the moment a business publishes one of its expenses. Everything else a business pays for stays
        private, so a quiet feed is what a young marketplace looks like, not an error.
      </EmptyState>
    );
  }

  const count = feed.data.listings.length;
  return (
    <Stack gap={3}>
      {feed.error ? (
        <ErrorState error={feed.error} onRetry={feed.reload} title="Showing the last loaded listings; a refresh failed" />
      ) : null}
      <p className="ui-text-muted ui-text-sm">
        {count} public {count === 1 ? 'listing' : 'listings'}
        {category ? ` in ${categoryLabel(category)}` : ''}
      </p>
      <div className="marketplace-feed__grid">
        {feed.data.listings.map((item) => (
          <MarketCard
            action={describeClosesIn(item.listing.challenge_deadline).isClosed ? undefined : (
              <ButtonLink to={`/listings/${item.listing.id}/challenge`} variant="primary">Bid</ButtonLink>
            )}
            href={`/listings/${item.listing.id}`}
            key={item.listing.id}
            listing={item.listing}
            offerCount={item.challenge_count}
          />
        ))}
      </div>
    </Stack>
  );
}
