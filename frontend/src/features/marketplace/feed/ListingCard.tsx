/* Renders one listing summary card in the public marketplace feed, laid out for a challenger reading on a phone.
   The card uses only the stored public projection returned by the backend. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { describeDeadline } from '../../../shared/format/describeDeadline';
import { Badge, ButtonLink, Card, Cluster, Icon, Stack, Stat } from '../../../shared/ui';
import { offerCountText } from '../offerCountText';
import type { MarketplaceListing } from '../types';
import './ListingCard.css';

interface ListingCardProps {
  item: MarketplaceListing;
}

/** Render one marketplace listing: the price it pays, its scope, its terms, and browse and challenge links. */
export function ListingCard({ item }: ListingCardProps): JSX.Element {
  const { listing } = item;
  const deadline = describeDeadline(listing.challenge_deadline);

  return (
    <Card
      actions={
        <>
          <BiddingModePill mode={listing.bidding_mode} />
          {deadline.isClosed ? <Badge icon={<Icon name="lock" />} tone="neutral">Closed</Badge> : null}
        </>
      }
      as="article"
      className="listing-card"
      description={listing.service_area_approximate || 'Area not specified'}
      title={categoryLabel(listing.category)}
      titleLevel={3}
    >
      <Stack className="listing-card__body" gap={4}>
        <Stat
          caption="Price published by the business"
          label="Currently pays"
          unit={`/ ${listing.billing_cadence}`}
          value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
        />
        <p className="listing-card__scope">{listing.scope_summary}</p>
        <Cluster className="listing-card__meta ui-text-sm">
          <span>{deadline.text}</span>
          <Badge tone="neutral">{offerCountText(item.challenge_count)}</Badge>
        </Cluster>
        <Cluster className="listing-card__actions">
          {deadline.isClosed ? null : (
            <ButtonLink to={`/listings/${listing.id}/challenge`} variant="primary">Challenge this price</ButtonLink>
          )}
          <ButtonLink to={`/listings/${listing.id}`}>View listing</ButtonLink>
        </Cluster>
      </Stack>
    </Card>
  );
}
