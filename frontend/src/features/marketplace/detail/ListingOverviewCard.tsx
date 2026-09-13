/* The listing's headline card: what the business currently pays, where that figure came from, and the scope it buys.
   Price and scope sit in one card so a challenger never reads one without the other. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Card, Stat } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import { ScopeRequirements } from './ScopeRequirements';
import './ListingOverviewCard.css';

interface ListingOverviewCardProps {
  listing: PublicListingProjection;
}

/** Render the headline price with its published-by provenance, followed by the structured scope. */
export function ListingOverviewCard({ listing }: ListingOverviewCardProps): JSX.Element {
  return (
    <Card label="Current price and scope">
      <Stat
        caption={`Price and scope as published by the business${listing.published_at ? ` on ${formatTimestamp(listing.published_at)}` : ''}.`}
        label="Currently pays"
        size="xl"
        unit={`/ ${listing.billing_cadence}`}
        value={<MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} />}
      />
      <hr className="listing-overview__divider" />
      <ScopeRequirements listing={listing} />
    </Card>
  );
}
