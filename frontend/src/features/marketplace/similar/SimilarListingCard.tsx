/* One similar public listing: its price and scope, how closely its scope matches, and a link to it.
   The match percentage is the exact similarity the backend computed; FlyHash only chose which listings to compare. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { ButtonLink, Card, Cluster, Stack, Stat } from '../../../shared/ui';
import { offerCountText } from '../offerCountText';
import type { SimilarListing } from './types';
import './SimilarListingCard.css';

interface SimilarListingCardProps {
  item: SimilarListing;
}

/** Render a compact card for one similar listing. */
export function SimilarListingCard({ item }: SimilarListingCardProps): JSX.Element {
  const { listing } = item;

  return (
    <Card
      actions={<BiddingModePill mode={listing.bidding_mode} />}
      as="article"
      className="similar-listing"
      description={listing.service_area_approximate || 'Area not specified'}
      padding="sm"
      title={categoryLabel(listing.category)}
      titleLevel={3}
      tone="subtle"
    >
      <Stack gap={3}>
        <Stat
          caption="Price published by the business"
          label="Currently pays"
          size="md"
          unit={`/ ${listing.billing_cadence}`}
          value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
        />
        <p className="similar-listing__scope">{listing.scope_summary}</p>
        <p className="ui-text-sm">
          <strong>Scope match {Math.round(item.scope_similarity * 100)}%</strong>
          {item.shared_terms.length > 0 ? (
            <span className="ui-text-muted"> · shared: {item.shared_terms.join(', ')}</span>
          ) : null}
        </p>
        <Cluster justify="between">
          <span className="ui-text-muted ui-text-sm">{offerCountText(item.challenge_count)}</span>
          <ButtonLink to={`/listings/${listing.id}`}>View listing</ButtonLink>
        </Cluster>
      </Stack>
    </Card>
  );
}
