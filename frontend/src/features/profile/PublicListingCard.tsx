/* Renders one public listing card on a business profile page.
   It consumes the additive public projection exactly as the API returns it. */
import { BiddingModePill } from '../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { describeDeadline } from '../../shared/format/describeDeadline';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { ButtonLink, Card, Cluster, Stack, Stat } from '../../shared/ui';
import type { PublicListingProjection } from '../publish/types';
import './PublicListingCard.css';

interface PublicListingCardProps {
  listing: PublicListingProjection;
}

/** Render one public listing summary card from the public profile API. */
export function PublicListingCard({ listing }: PublicListingCardProps): JSX.Element {
  return (
    <Card
      actions={<BiddingModePill mode={listing.bidding_mode} />}
      as="article"
      className="public-listing-card"
      description={listing.service_area_approximate || 'Area not specified'}
      title={categoryLabel(listing.category)}
      titleLevel={3}
    >
      <Stack className="public-listing-card__body" gap={4}>
        <Stat
          caption="Price published by the business"
          label="Currently pays"
          unit={`/ ${listing.billing_cadence}`}
          value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
        />
        <p className="public-listing-card__scope">{listing.scope_summary}</p>
        <p className="ui-text-muted ui-text-sm">
          {describeDeadline(listing.challenge_deadline).text}
          {listing.published_at ? ` · published ${formatTimestamp(listing.published_at)}` : ''}
        </p>
        <Cluster className="public-listing-card__actions">
          <ButtonLink to={`/listings/${listing.id}`}>View listing and offers</ButtonLink>
        </Cluster>
      </Stack>
    </Card>
  );
}
