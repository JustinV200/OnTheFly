/* Shows the exact public payload the API returned for this draft, field for field, before anything is published.
   It renders the backend's JSON verbatim beside a readable summary and invents no field (roadmap 09, step 2). */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { describeScopeExpectations } from '../../shared/format/describeScopeExpectations';
import type { ListingPreviewResponse } from './types';

const NEVER_PUBLIC = [
  'Raw transaction history',
  'Account and connection details',
  'Your other expenses, public or private',
  'Who has challenged you (challenger identities)',
  'Offer prices, unless you choose open bidding',
  'Exact street address',
];

interface PublishPreviewProps {
  preview: ListingPreviewResponse | null;
}

/** Render the preview projection and the list of things that never become public. */
export function PublishPreview({ preview }: PublishPreviewProps): JSX.Element | null {
  if (!preview) {
    return null;
  }
  const listing = preview.projection;

  return (
    <section style={{ border: '2px solid #1d4ed8', borderRadius: '12px', marginTop: '1.25rem', padding: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>2. This is exactly what becomes public</h2>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem' }}>{categoryLabel(listing.category)}</h3>
          <p style={{ fontSize: '1.3rem', margin: '0 0 0.25rem' }}>
            <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} /> / {listing.billing_cadence}
          </p>
          <p style={{ margin: '0 0 0.25rem' }}>{listing.scope_summary}</p>
          <p style={{ margin: '0 0 0.25rem' }}>Requested terms: {describeScopeExpectations(listing)}</p>
          <p style={{ margin: '0 0 0.25rem' }}>Area: {listing.service_area_approximate || 'not specified'}</p>
          <p style={{ margin: '0 0 0.25rem' }}>Bidding: {listing.bidding_mode}</p>
          <p style={{ margin: 0 }}>Current vendor: {listing.incumbent_vendor_name ?? 'hidden'}</p>
          <h4 style={{ marginBottom: '0.25rem' }}>Never public</h4>
          <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
            {NEVER_PUBLIC.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <p style={{ margin: '0 0 0.25rem' }}>
            The public API will serve this payload and nothing else. <code>visibility</code> and <code>published_at</code> are set at
            the moment you publish.
          </p>
          <pre style={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.8rem', margin: 0, overflowX: 'auto', padding: '0.75rem' }}>
            {JSON.stringify(listing, null, 2)}
          </pre>
          <p style={{ color: '#475569', fontSize: '0.8rem', margin: '0.25rem 0 0', wordBreak: 'break-all' }}>
            Payload hash {preview.payload_hash}: publishing is refused if the payload changes after this preview.
          </p>
        </div>
      </div>
    </section>
  );
}
