/* The market board: every public listing as a market card, with search, category and sort. Fetches the whole feed
   once (polled) and filters client-side, so category counts describe the feed. Read-only; never touches private data. */
import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { PageHeader, Stack } from '../../shared/ui';
import { BoardControls } from './board/BoardControls';
import { buildCategoryChips } from './board/filters/categoryChips';
import { filterListings } from './board/filters/filterListings';
import { sortListings } from './board/filters/sortListings';
import { useBoardFilters } from './board/filters/useBoardFilters';
import { MarketBoard } from './board/MarketBoard';
import type { MarketplaceFeedResponse } from './types';

const POLL_INTERVAL_MS = 10000;

/** Render the public market board. */
export function MarketplacePage(): JSX.Element {
  const { account } = useActingAccount();
  const feed = useApiQuery<MarketplaceFeedResponse>('/api/marketplace', { pollIntervalMs: POLL_INTERVAL_MS });
  const filters = useBoardFilters();

  const listings = feed.data?.listings ?? [];
  const visibleListings = sortListings(filterListings(listings, filters.category, filters.searchText), filters.sort);

  return (
    <Stack gap={5}>
      <PageHeader
        subtitle={
          // Said once here rather than on every card: each price is what that business published, not a platform estimate.
          `Prices are published by each business. ${account ? 'Your own listings aren’t shown here.' : 'Choose a business in the account menu to bid.'}`
        }
        title="Markets"
      />

      <BoardControls
        category={filters.category}
        categoryChips={feed.data ? buildCategoryChips(listings, filters.category) : null}
        onCategoryChange={filters.setCategory}
        onSearchTextChange={filters.setSearchText}
        onSortChange={filters.setSort}
        searchText={filters.searchText}
        sort={filters.sort}
      />

      <section aria-labelledby="market-board-heading">
        {/* Keeps the outline h1 → h2 → card h3 for screen readers; the count line under it is the visible heading. */}
        <h2 className="ui-visually-hidden" id="market-board-heading">Public markets</h2>
        <MarketBoard
          canBid={account !== null}
          feed={feed}
          isFiltered={filters.isFiltered}
          onClearFilters={filters.clearFilters}
          visibleListings={visibleListings}
        />
      </section>
    </Stack>
  );
}
