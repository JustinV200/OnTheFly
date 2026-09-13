/* The top of the Offers page, read like a market from the owner's side: back to My listings, the category tile, the
   page's h1, area and scope in one line, and the listing's state (visibility, bidding mode, and time left while public)
   before any action. */
import { Link } from 'react-router-dom';

import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { CategoryTile, describeClosesIn } from '../../../shared/market';
import { Badge, Icon, PageHeader } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import { ListingVisibilityBadge } from './ListingVisibilityBadge';
import './InboxHeader.css';

// The owner's portfolio of listings (roadmap 11, "My listings").
const MY_LISTINGS_PATH = '/my-listings';

/** Render the page header for a loaded listing; pass no listing for the loading, error, and not-owner states. */
export function InboxHeader({ listing }: { listing: PublicListingProjection | null }): JSX.Element {
  const back = (
    <Link className="inbox-header__back" to={MY_LISTINGS_PATH}>
      <Icon name="arrow-left" size={14} />
      My listings
    </Link>
  );
  if (!listing) {
    return (
      <div className="inbox-header">
        {back}
        <PageHeader title="Offers on your listing" />
      </div>
    );
  }

  const closes = describeClosesIn(listing.challenge_deadline);
  const area = listing.service_area_approximate || 'Area not specified';
  return (
    <div className="inbox-header">
      {back}
      <div className="inbox-header__main">
        <CategoryTile category={listing.category} size="lg" />
        <PageHeader
          meta={(
            <>
              <ListingVisibilityBadge visibility={listing.visibility} />
              <BiddingModePill mode={listing.bidding_mode} />
              {/* Time left only means something while strangers can bid; a private listing takes no offers. */}
              {listing.visibility === 'public' ? (
                <Badge icon={<Icon name="clock" />} title={closes.exact ?? undefined} tone={closes.isClosed ? 'danger' : 'neutral'}>
                  {closes.label}
                </Badge>
              ) : null}
            </>
          )}
          subtitle={`${area} · ${listing.scope_summary}`}
          title={`Offers on your ${categoryLabel(listing.category).toLowerCase()} listing`}
        />
      </div>
    </div>
  );
}
