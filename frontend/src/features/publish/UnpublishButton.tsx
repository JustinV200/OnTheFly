/* Unpublishes a listing immediately, with no confirmation step.
   Unpublishing is the safe direction, so it must stay one click (CLAUDE.md: "can unpublish instantly"). */
import { useState } from 'react';

import { ApiError, post } from '../../shared/api/client';

interface UnpublishButtonProps {
  listingId: string;
  onUnpublished: () => void;
}

/** Render an unpublish button that reports failure inline and calls onUnpublished on success. */
export function UnpublishButton({ listingId, onUnpublished }: UnpublishButtonProps): JSX.Element {
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unpublish = async (): Promise<void> => {
    setIsWorking(true);
    setErrorMessage(null);
    try {
      await post(`/api/listings/${listingId}/unpublish`);
      onUnpublished();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      // A failed unpublish means the listing may still be public; say that, don't imply success.
      setErrorMessage(`Still public: ${error.message}`);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      <button
        disabled={isWorking}
        onClick={(event) => {
          // Rows that contain this button are clickable; unpublishing must not also select the row.
          event.stopPropagation();
          void unpublish();
        }}
        type="button"
      >
        {isWorking ? 'Unpublishing…' : 'Unpublish now'}
      </button>
      {errorMessage ? <span role="alert" style={{ color: '#991b1b', fontSize: '0.85rem' }}>{errorMessage}</span> : null}
    </span>
  );
}
