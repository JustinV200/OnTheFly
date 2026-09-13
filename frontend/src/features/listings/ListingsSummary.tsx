/* The small summary over My listings: how many listings are live and how many offers they hold. Counts only, no money.
   An offer total that is still loading or partly failed says so instead of showing a smaller number as if complete. */
import { Icon, Stat } from '../../shared/ui';
import { listingStatus } from './card/listingStatus';
import type { OwnerListing } from './useOwnerListings';
import './ListingsSummary.css';

interface ListingsSummaryProps {
  listings: OwnerListing[];
}

/** Render the live-listing and offer-count tiles. */
export function ListingsSummary({ listings }: ListingsSummaryProps): JSX.Element {
  const statuses = listings.map(listingStatus);
  const liveCount = statuses.filter((status) => status.isPublic).length;
  const loadedCounts = statuses.flatMap((status) => (status.offerCount === null ? [] : [status.offerCount]));
  const offerTotal = loadedCounts.reduce((total, count) => total + count, 0);
  const missingCount = listings.length - loadedCounts.length;
  const isLoading = listings.some((listing) => listing.inbox.phase === 'loading');

  return (
    <div className="listings-summary">
      <div className="listings-summary__tile">
        <Stat
          caption={`${listings.length - liveCount} private`}
          label={<span className="listings-summary__label"><Icon name="globe" size={14} />Live listings</span>}
          size="md"
          value={liveCount}
        />
      </div>
      <div className="listings-summary__tile">
        <Stat
          caption={
            missingCount === 0
              ? 'Including offers kept on unpublished listings'
              : isLoading ? 'Counting…' : `${missingCount} ${missingCount === 1 ? 'listing' : 'listings'} not counted: couldn’t load`
          }
          label={<span className="listings-summary__label"><Icon name="users" size={14} />Offers received</span>}
          size="md"
          value={missingCount === 0 ? offerTotal : isLoading ? '…' : `${offerTotal}+`}
        />
      </div>
    </div>
  );
}
