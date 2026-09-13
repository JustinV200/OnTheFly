/* The market page's tabs: Scope, Leaderboard (open bidding only) and How bidding works. A sealed listing has no
   Leaderboard tab at all, since there are no public prices to rank; its offer count is in the header and offer panel. */
import type { ApiQueryState } from '../../../../shared/api/useApiQuery';
import type { ClosesIn } from '../../../../shared/market';
import { TabItem, Tabs } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import { LeaderboardTab } from '../../leaderboard/LeaderboardTab';
import type { LeaderboardResponse } from '../../types';
import { BiddingRules } from './BiddingRules';
import { ScopeRequirements } from './ScopeRequirements';

interface MarketTabsProps {
  listing: PublicListingProjection;
  board: ApiQueryState<LeaderboardResponse>;
  closes: ClosesIn;
  className?: string;
}

/** Render the tab set for one market page. */
export function MarketTabs({ listing, board, closes, className }: MarketTabsProps): JSX.Element {
  // Anything but an explicit "open" is sealed, so an unset or unexpected mode never offers a price table.
  const isOpen = listing.bidding_mode === 'open';
  const pricedCount = board.data?.entries.length;

  const tabs: TabItem[] = [
    { id: 'scope', label: 'Scope', content: <ScopeRequirements listing={listing} /> },
    ...(isOpen ? [{ id: 'leaderboard', label: 'Leaderboard', meta: pricedCount, content: <LeaderboardTab board={board} isClosed={closes.isClosed} /> }] : []),
    { id: 'rules', label: 'How bidding works', content: <BiddingRules biddingMode={listing.bidding_mode} closes={closes} /> },
  ];

  return (
    <section aria-label="Market details" className={className}>
      <Tabs label="Market details" tabs={tabs} />
    </section>
  );
}
