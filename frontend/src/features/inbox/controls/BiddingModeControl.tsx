/* Sealed / Open for one listing, as a segmented control that calls the bidding-mode endpoint when the owner picks the
   other mode. The hint states before any change that it is never retroactive, and the result sentence restates it for
   the mode just chosen. Anything but an explicit "open" is shown as sealed, the safe fallback (CLAUDE.md, marketplace). */
import { useEffect, useState } from 'react';

import { ApiError, post } from '../../../shared/api/client';
import { Callout, Icon, SegmentedControl, SegmentedOption } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';

type Mode = 'sealed' | 'open';

const OPTIONS: SegmentedOption<Mode>[] = [
  { value: 'sealed', label: 'Sealed', icon: <Icon name="lock" size={13} /> },
  { value: 'open', label: 'Open', icon: <Icon name="eye" size={13} /> },
];

// The last change's outcome, in words; a failure is announced as an alert, a success as a status.
interface ModeChangeResult {
  text: string;
  isFailure: boolean;
}

interface BiddingModeControlProps {
  listing: PublicListingProjection;
  onChanged: () => void;
}

/** Render the bidding mode row with its hint and the outcome of the last change. */
export function BiddingModeControl({ listing, onChanged }: BiddingModeControlProps): JSX.Element {
  const storedMode: Mode = listing.bidding_mode === 'open' ? 'open' : 'sealed';
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState<ModeChangeResult | null>(null);

  // The choice stays shown until the reloaded listing reports it, so the control doesn't flick back while polling catches up.
  useEffect(() => {
    setPendingMode(null);
  }, [listing.bidding_mode]);

  const changeMode = async (nextMode: Mode): Promise<void> => {
    if (nextMode === storedMode || isWorking) {
      return;
    }
    setIsWorking(true);
    setPendingMode(nextMode);
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
      setPendingMode(null);
      setResult({ isFailure: true, text: `Bidding mode unchanged: ${error.message}` });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="listing-controls__row">
      <div className="listing-controls__line">
        <span className="listing-controls__label">Bidding</span>
        <SegmentedControl
          isDisabled={isWorking}
          label="Bidding mode"
          onChange={(mode) => void changeMode(mode)}
          options={OPTIONS}
          size="sm"
          value={pendingMode ?? storedMode}
        />
      </div>
      <p className="listing-controls__hint">
        {storedMode === 'open' ? 'Offer prices are public, never who made them.' : 'Only the offer count is public.'} A change applies
        to new offers only.
      </p>
      {result ? (
        <Callout role={result.isFailure ? 'alert' : 'status'} tone={result.isFailure ? 'danger' : 'success'}>
          <p>{result.text}</p>
        </Callout>
      ) : null}
    </div>
  );
}
