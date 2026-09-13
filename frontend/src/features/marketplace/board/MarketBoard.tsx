/* Renders the market board's state: loading, failed, an empty feed, no matches for the filters, or the card grid.
   A failed background poll keeps the last markets on screen but says they may be stale. */
import type { ApiQueryState } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { describeClosesIn, MarketCard } from '../../../shared/market';
import { Button, ButtonLink, Stack } from '../../../shared/ui';
import { MarketGrid } from '../grid/MarketGrid';
import type { MarketplaceFeedResponse, MarketplaceListing } from '../types';
import { BoardSkeleton } from './BoardSkeleton';

interface MarketBoardProps {
  feed: ApiQueryState<MarketplaceFeedResponse>;
  // The feed after search, category and sort; the page owns that step.
  visibleListings: MarketplaceListing[];
  isFiltered: boolean;
  onClearFilters: () => void;
  // False for a public visitor: offers come from a business, so cards carry no Bid button.
  canBid: boolean;
}

/** Render the board body for the current feed and filters. */
export function MarketBoard({ feed, visibleListings, isFiltered, onClearFilters, canBid }: MarketBoardProps): JSX.Element {
  if (!feed.data) {
    return feed.error
      ? <ErrorState error={feed.error} onRetry={feed.reload} title="Couldn’t load the markets" />
      : <BoardSkeleton />;
  }

  const totalCount = feed.data.listings.length;
  if (totalCount === 0) {
    return (
      <EmptyState title="No open markets yet">
        A market opens the moment a business publishes one of its expenses for bids. Everything else a business pays for
        stays private, so a quiet board is what a young marketplace looks like, not an error.
      </EmptyState>
    );
  }

  return (
    <Stack gap={3}>
      {feed.error ? (
        <ErrorState error={feed.error} onRetry={feed.reload} title="Showing the last loaded markets; a refresh failed" />
      ) : null}
      {/* Announced politely, so a screen-reader user hears how many markets a filter left. */}
      <p aria-live="polite" className="ui-text-muted ui-text-sm">
        {isFiltered ? `${visibleListings.length} of ${totalCount} markets` : `${totalCount} ${totalCount === 1 ? 'market' : 'markets'}`}
      </p>
      {visibleListings.length === 0 ? (
        <EmptyState action={<Button onClick={onClearFilters}>Clear filters</Button>} title="No markets match">
          Nothing on the board matches that search and category. Clear the filters to see all {totalCount} markets.
        </EmptyState>
      ) : (
        <MarketGrid>
          {visibleListings.map((item) => (
            <MarketCard
              action={canBid && !describeClosesIn(item.listing.challenge_deadline).isClosed ? (
                <ButtonLink to={`/listings/${item.listing.id}/challenge`} variant="primary">Bid</ButtonLink>
              ) : undefined}
              href={`/listings/${item.listing.id}`}
              key={item.listing.id}
              listing={item.listing}
              offerCount={item.challenge_count}
            />
          ))}
        </MarketGrid>
      )}
    </Stack>
  );
}
