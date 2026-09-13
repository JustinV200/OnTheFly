/* Unpublishes a listing immediately, with no confirmation step.
   Unpublishing is the safe direction, so it must stay one click (CLAUDE.md: "can unpublish instantly") and is never styled as danger. */
import { useState } from 'react';

import { ApiError, post } from '../../shared/api/client';
import { Button, ButtonSize, Icon } from '../../shared/ui';
import './UnpublishButton.css';

interface UnpublishButtonProps {
  listingId: string;
  onUnpublished: () => void;
  // Dense rows (the dashboard table) can ask for "sm"; the default matches every other secondary button.
  size?: ButtonSize;
}

/** Render an unpublish button that reports failure inline and calls onUnpublished on success. */
export function UnpublishButton({ listingId, onUnpublished, size = 'md' }: UnpublishButtonProps): JSX.Element {
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
    <span className="unpublish-button">
      <Button
        iconStart={<Icon name="lock" />}
        isBusy={isWorking}
        onClick={(event) => {
          // Rows that contain this button are clickable; unpublishing must not also select the row.
          event.stopPropagation();
          void unpublish();
        }}
        size={size}
      >
        {isWorking ? 'Unpublishing…' : 'Unpublish now'}
      </Button>
      {errorMessage ? <span className="unpublish-button__error" role="alert">{errorMessage}</span> : null}
    </span>
  );
}
