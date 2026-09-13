/* The task-market card: one public listing shown like a market. Category and area as the title, what the business pays
   now as the big number, one line of scope, then bidding mode, offers, and time left. Used by the marketplace feed,
   similar listings, the public profile, and the publish preview, so a preview is literally what a stranger sees.
   Built only from public projection fields; it never takes private expense data. */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { BiddingModePill } from '../components/BiddingModePill';
import { MoneyDisplay } from '../components/MoneyDisplay';
import { categoryLabel } from '../format/categoryLabel';
import { Badge, Icon } from '../ui';
import { cadenceSuffix } from './cadenceSuffix';
import { CategoryTile } from './CategoryTile';
import { describeClosesIn } from './describeClosesIn';
import './MarketCard.css';

// The public listing fields the card reads. Structural, so any projection-shaped object fits without a feature import.
export interface MarketCardListing {
  id: string;
  category: string;
  service_area_approximate: string;
  scope_summary: string;
  price_minor: number;
  price_currency: string;
  billing_cadence: string;
  bidding_mode: string;
  challenge_deadline: string | null;
}

interface MarketCardProps {
  listing: MarketCardListing;
  // Active offers; the count is public in both bidding modes. null when there can't be any yet (a draft preview).
  offerCount: number | null;
  // When set, the whole card opens this link; the action slot stays separately clickable.
  href?: string;
  // The card's single button (e.g. "Bid"), or a note when bidding isn't possible for this viewer.
  action?: ReactNode;
  // Extra badges for the meta row, e.g. a similarity score.
  extraMeta?: ReactNode;
  // Words under the price. Omit on a page that already says prices are published by the business.
  priceCaption?: string;
  headingLevel?: 2 | 3;
}

/** Render one market card. */
export function MarketCard({ listing, offerCount, href, action, extraMeta, priceCaption, headingLevel = 3 }: MarketCardProps): JSX.Element {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const closes = describeClosesIn(listing.challenge_deadline);
  const title = categoryLabel(listing.category);

  return (
    <article className={href ? 'market-card market-card--linked' : 'market-card'}>
      <header className="market-card__header">
        <CategoryTile category={listing.category} />
        <div className="market-card__heading">
          <Heading className="market-card__title">
            {/* A stretched link: the title is the one real link, and CSS extends its hit area over the card. */}
            {href ? <Link className="market-card__link" to={href}>{title}</Link> : title}
          </Heading>
          <p className="market-card__area">{listing.service_area_approximate || 'Area not specified'}</p>
        </div>
      </header>

      <div className="market-card__price">
        <span className="market-card__amount">
          <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />
        </span>
        <span className="market-card__period">{cadenceSuffix(listing.billing_cadence)}</span>
      </div>
      <p className="market-card__price-caption">{priceCaption ?? 'Current price'}</p>

      <p className="market-card__scope" title={listing.scope_summary}>{listing.scope_summary}</p>

      <div className="market-card__meta">
        <BiddingModePill mode={listing.bidding_mode} />
        {offerCount === null ? null : (
          <Badge icon={<Icon name="users" />} tone="neutral">{offerCount === 1 ? '1 offer' : `${offerCount} offers`}</Badge>
        )}
        <Badge icon={<Icon name="clock" />} title={closes.exact ?? undefined} tone={closes.isClosed ? 'danger' : 'neutral'}>
          {closes.label}
        </Badge>
        {extraMeta}
      </div>

      {action ? <div className="market-card__action">{action}</div> : null}
    </article>
  );
}
