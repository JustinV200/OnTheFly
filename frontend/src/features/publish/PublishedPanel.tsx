/* Confirms a publish and sets up the privacy proof: open the public profile as a stranger would. */
import { Link } from 'react-router-dom';

import type { DemoAccount } from '../../shared/account/demoAccounts';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import type { PublicListingProjection } from './types';
import { UnpublishButton } from './UnpublishButton';

interface PublishedPanelProps {
  account: DemoAccount;
  listing: PublicListingProjection;
  onUnpublished: () => void;
}

/** Render the published confirmation with links to the public views and an instant unpublish. */
export function PublishedPanel({ account, listing, onUnpublished }: PublishedPanelProps): JSX.Element {
  const profileUrl = `${window.location.origin}/p/${account.handle}`;

  return (
    <section style={{ backgroundColor: '#ecfdf5', border: '2px solid #047857', borderRadius: '12px', marginTop: '1.25rem', padding: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Published{listing.published_at ? ` ${formatTimestamp(listing.published_at)}` : ''}</h2>
      <p>
        This one listing is now public. Every other expense stays private. To see what a stranger sees, open the public profile in
        a private or logged-out window:
      </p>
      <p>
        <code style={{ fontSize: '1rem' }}>{profileUrl}</code>{' '}
        <button onClick={() => void navigator.clipboard?.writeText(profileUrl)} type="button">Copy link</button>
      </p>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to={`/p/${account.handle}`}>Open public profile</Link>
        <Link to={`/listings/${listing.id}`}>View listing as challengers see it</Link>
        <Link to={`/listings/${listing.id}/inbox`}>Offers inbox</Link>
        <UnpublishButton listingId={listing.id} onUnpublished={onUnpublished} />
      </div>
    </section>
  );
}
