/* Shows a single marketplace listing fetched directly by its ID.
   Uses a dedicated endpoint so the whole feed is not loaded for one record. */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { get } from '../../shared/api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { MarketplaceListing } from './types';

/** Render one public listing detail page fetched by listing ID. */
export function ListingDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const [item, setItem] = useState<MarketplaceListing | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await get<MarketplaceListing>(`/api/marketplace/${id}`);
        setItem(response);
      } catch {
        setNotFound(true);
      }
    })();
  }, [id]);

  if (notFound) {
    return <p>Listing not found or no longer public.</p>;
  }

  if (!item) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <h2>{item.listing.category}</h2>
      <p>{item.listing.scope_summary}</p>
      <p>
        <MoneyDisplay amountMinor={item.listing.price_minor} currency={item.listing.price_currency} />
        {' '}/ {item.listing.billing_cadence}
      </p>
      {/* Bidding mode stated plainly so challengers know before submitting. */}
      <p>
        <strong>Bidding mode:</strong>{' '}
        {item.listing.bidding_mode === 'open'
          ? 'Open — your price and scope will be visible to other challengers. Your identity will not.'
          : 'Sealed — offer count only is public. Your price stays private.'}
      </p>
      <p>{item.challenge_count} challenges received</p>
      <Link to={`/listings/${item.listing.id}/challenge`}>Submit a challenge</Link>
    </section>
  );
}
