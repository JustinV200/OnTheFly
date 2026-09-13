/* The top of a market page: a way back to the board, the category tile beside the title and area, and the badges a
   bidder reads before anything else (bidding mode, offer count, time left). Holds the page's single h1.
   Not PageHeader: a market title sits beside its tile, which PageHeader's title/subtitle stack doesn't lay out. */
import { Link } from 'react-router-dom';

import { BiddingModePill } from '../../../../shared/components/BiddingModePill';
import { categoryLabel } from '../../../../shared/format/categoryLabel';
import { CategoryTile, ClosesIn } from '../../../../shared/market';
import { Badge, Icon, joinClassNames } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import './MarketHeader.css';

interface MarketHeaderProps {
  listing: PublicListingProjection;
  offerCount: number;
  closes: ClosesIn;
  className?: string;
}

/** Render the market page header. */
export function MarketHeader({ listing, offerCount, closes, className }: MarketHeaderProps): JSX.Element {
  return (
    <header className={joinClassNames('market-header', className)}>
      <Link className="market-header__back" to="/marketplace">
        <Icon name="arrow-left" size={14} />
        Markets
      </Link>

      <div className="market-header__identity">
        <CategoryTile category={listing.category} size="lg" />
        <div className="market-header__heading">
          <h1 className="market-header__title">{categoryLabel(listing.category)}</h1>
          <p className="market-header__area">{listing.service_area_approximate || 'Area not specified'}</p>
        </div>
      </div>

      <div className="market-header__meta">
        <BiddingModePill mode={listing.bidding_mode} />
        <Badge icon={<Icon name="users" />} tone="neutral">{offerCount === 1 ? '1 offer' : `${offerCount} offers`}</Badge>
        {/* The relative words fit a badge; the exact time is on hover and in the ticket. */}
        <Badge icon={<Icon name="clock" />} title={closes.exact ?? undefined} tone={closes.isClosed ? 'danger' : 'neutral'}>
          {closes.label}
        </Badge>
      </div>
    </header>
  );
}
