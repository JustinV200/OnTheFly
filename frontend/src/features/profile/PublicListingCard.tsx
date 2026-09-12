/* Renders one public listing card on a business profile page.
   It consumes the additive public projection exactly as the API returns it. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { PublicListingProjection } from '../publish/types';

interface PublicListingCardProps {
  listing: PublicListingProjection;
}

/** Render one public listing summary card from the public profile API. */
export function PublicListingCard({ listing }: PublicListingCardProps): JSX.Element {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1rem', padding: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>{listing.category}</h3>
      <p>{listing.scope_summary}</p>
      <p><MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} /> / {listing.billing_cadence}</p>
      <p>Bidding mode: {listing.bidding_mode}</p>
    </article>
  );
}
