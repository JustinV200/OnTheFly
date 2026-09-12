/* The owner's controls for one listing: bidding mode, unpublish, and links to its public views.
   A mode change is never retroactive, and the confirmation text says so every time. */
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { ApiError, post } from '../../../shared/api/client';
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import type { PublicListingProjection } from '../../publish/types';
import { UnpublishButton } from '../../publish/UnpublishButton';

interface ListingControlsProps {
  listing: PublicListingProjection;
  onChanged: () => void;
}

/** Render mode toggle, unpublish or republish, and public links for an owned listing. */
export function ListingControls({ listing, onChanged }: ListingControlsProps): JSX.Element {
  const { account } = useActingAccount();
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const isPublic = listing.visibility === 'public';

  const toggleBiddingMode = async (): Promise<void> => {
    const nextMode = listing.bidding_mode === 'open' ? 'sealed' : 'open';
    setIsWorking(true);
    try {
      await post(`/api/listings/${listing.id}/bidding-mode`, { mode: nextMode });
      setMessage(
        nextMode === 'open'
          ? 'Bidding is now open. Only offers submitted from now on show their prices publicly. Offers received while sealed stay sealed.'
          : 'Bidding is now sealed. Future offers are private. Prices already published under open bidding stay as they were submitted.',
      );
      onChanged();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setMessage(`Bidding mode unchanged: ${error.message}`);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <section style={{ border: '1px solid #e2e8f0', borderRadius: '12px', margin: '1rem 0', padding: '0.75rem 1rem' }}>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <BiddingModePill mode={listing.bidding_mode} />
        <button disabled={isWorking} onClick={() => void toggleBiddingMode()} type="button">
          {listing.bidding_mode === 'open' ? 'Switch to sealed bidding' : 'Open bidding to underbids'}
        </button>
        {isPublic ? (
          <>
            <UnpublishButton listingId={listing.id} onUnpublished={onChanged} />
            <Link to={`/listings/${listing.id}`}>Public listing page</Link>
            {account ? <Link to={`/p/${account.handle}`}>Public profile</Link> : null}
          </>
        ) : (
          <Link to={`/publish?expense=${listing.expense_id}`}>Publish again…</Link>
        )}
      </div>
      {message ? <p role="status" style={{ marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
