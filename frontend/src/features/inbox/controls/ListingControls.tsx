/* The owner's controls for one listing: bidding mode, unpublish, and links to its public views.
   A mode change is never retroactive, and the confirmation text says so every time. */
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { ApiError, post } from '../../../shared/api/client';
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { Button, ButtonLink, Callout, Card, Cluster, Stack } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import { UnpublishButton } from '../../publish/UnpublishButton';
import { ListingVisibilityBadge } from '../header/ListingVisibilityBadge';
import './ListingControls.css';

interface ListingControlsProps {
  listing: PublicListingProjection;
  onChanged: () => void;
}

// The last mode change's outcome, in words; a failure is announced as an alert, a success as a status.
interface ModeChangeResult {
  text: string;
  isFailure: boolean;
}

/** Render mode toggle, unpublish or republish, and public links for an owned listing. */
export function ListingControls({ listing, onChanged }: ListingControlsProps): JSX.Element {
  const { account } = useActingAccount();
  const [result, setResult] = useState<ModeChangeResult | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const isPublic = listing.visibility === 'public';

  const toggleBiddingMode = async (): Promise<void> => {
    const nextMode = listing.bidding_mode === 'open' ? 'sealed' : 'open';
    setIsWorking(true);
    try {
      await post(`/api/listings/${listing.id}/bidding-mode`, { mode: nextMode });
      setResult({
        isFailure: false,
        text: nextMode === 'open'
          ? 'Bidding is now open. Only offers submitted from now on show their prices publicly. Offers received while sealed stay sealed.'
          : 'Bidding is now sealed. Future offers are private. Prices already published under open bidding stay as they were submitted.',
      });
      onChanged();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setResult({ isFailure: true, text: `Bidding mode unchanged: ${error.message}` });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Card title="Bidding and visibility">
      <Stack gap={4}>
        <div className="listing-controls__row">
          <Cluster gap={2} justify="between">
            <h3 className="listing-controls__heading">Bidding</h3>
            <BiddingModePill mode={listing.bidding_mode} />
          </Cluster>
          <Cluster gap={3}>
            <Button isBusy={isWorking} onClick={() => void toggleBiddingMode()}>
              {listing.bidding_mode === 'open' ? 'Switch to sealed bidding' : 'Open bidding to underbids'}
            </Button>
          </Cluster>
        </div>

        <div className="listing-controls__row">
          <Cluster gap={2} justify="between">
            <h3 className="listing-controls__heading">Visibility</h3>
            <ListingVisibilityBadge visibility={listing.visibility} />
          </Cluster>
          {isPublic ? (
            <Cluster gap={4}>
              <UnpublishButton listingId={listing.id} onUnpublished={onChanged} />
              <Link to={`/listings/${listing.id}`}>Public listing page</Link>
              {account ? <Link to={`/p/${account.handle}`}>Public profile</Link> : null}
            </Cluster>
          ) : (
            <Cluster gap={3}>
              <ButtonLink to={`/publish?expense=${listing.expense_id}`}>Publish again…</ButtonLink>
            </Cluster>
          )}
        </div>

        {result ? (
          <Callout role={result.isFailure ? 'alert' : 'status'} tone={result.isFailure ? 'danger' : 'success'}>
            <p>{result.text}</p>
          </Callout>
        ) : null}
      </Stack>
    </Card>
  );
}
