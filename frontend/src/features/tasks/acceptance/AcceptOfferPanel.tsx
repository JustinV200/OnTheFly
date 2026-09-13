/* Accepting one offer: the server's check (anything that blocks it, an above-price warning, the remainder it leaves),
   then "Accept and transfer ownership". By default the check waits for "Review accepting…"; with isReviewedOnOpen it
   loads as soon as the panel opens, so the task page's flow is two clicks ("Accept…", then accept). Acceptance closes
   bidding and makes the bidder the task owner; it is a marketplace record, not a contract (CLAUDE.md). Nothing here
   decides a block or computes a figure: the server's check says, and the accept endpoint enforces it again. */
import { useEffect, useState } from 'react';

import { ApiError } from '../../../shared/api/client';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix, perPeriodWords } from '../../../shared/market';
import { Button, Callout, Checkbox, Icon, Spinner, Stack } from '../../../shared/ui';
import type { TaskDetail } from '../types';
import { AcceptanceCheck, acceptOffer, checkAcceptance } from './acceptanceApi';

interface AcceptOfferPanelProps {
  taskId: string;
  challengeId: string;
  bidderName: string;
  onAccepted: (task: TaskDetail) => void;
  // Load the check on open instead of behind a "Review accepting…" button. The offers drawer keeps the button.
  isReviewedOnOpen?: boolean;
  // Called by Cancel when the check loaded on open, since there is no earlier step to go back to.
  onCancel?: () => void;
}

/** Render the review-then-accept control for one offer. */
export function AcceptOfferPanel({ taskId, challengeId, bidderName, onAccepted, isReviewedOnOpen = false, onCancel }: AcceptOfferPanelProps): JSX.Element {
  const [check, setCheck] = useState<AcceptanceCheck | null>(null);
  const [isAboveConfirmed, setIsAboveConfirmed] = useState(false);
  const [isWorking, setIsWorking] = useState(isReviewedOnOpen);
  const [error, setError] = useState<ApiError | null>(null);

  const review = async (): Promise<void> => {
    setIsWorking(true);
    setError(null);
    try {
      setCheck(await checkAcceptance(taskId, challengeId));
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught);
    } finally {
      setIsWorking(false);
    }
  };

  // Once per opening: the panel is mounted when "Accept…" is pressed and unmounted on close.
  useEffect(() => {
    if (isReviewedOnOpen) {
      void review();
    }
  }, []);

  const accept = async (): Promise<void> => {
    setIsWorking(true);
    setError(null);
    try {
      onAccepted(await acceptOffer(taskId, challengeId, isAboveConfirmed));
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught);
      // The state may have moved (another offer accepted, a split made): show the fresh check, not the stale one.
      void review();
    } finally {
      setIsWorking(false);
    }
  };

  if (!check) {
    if (isReviewedOnOpen && isWorking) {
      return <p className="ui-text-sm" role="status"><Spinner size="sm" /> Checking what accepting {bidderName}’s offer would do…</p>;
    }
    return (
      <Stack gap={2}>
        <Button iconStart={<Icon name="check-circle" />} isBusy={isWorking} onClick={() => void review()} variant="primary">
          {isWorking ? 'Checking…' : isReviewedOnOpen ? 'Check again' : `Review accepting ${bidderName}’s offer`}
        </Button>
        {error ? <Callout role="alert" title="Couldn’t check this offer" tone="danger"><p>{error.message}</p></Callout> : null}
      </Stack>
    );
  }

  const needsConfirmation = check.is_above_listed_price && !isAboveConfirmed;
  return (
    <Stack gap={3}>
      {check.blocks.length > 0 ? (
        <Callout role="alert" title="This offer can’t be accepted" tone="danger">
          <ul>{check.blocks.map((block) => <li key={block.code}>{block.message}</li>)}</ul>
        </Callout>
      ) : (
        <Callout role="note" title={`Accept ${bidderName}’s offer?`} tone="info">
          <p>
            <strong><MoneyDisplay amountMinor={check.offer_price_minor} currency={check.currency} /> {cadenceSuffix(check.billing_period)}</strong>{' '}
            (restated {perPeriodWords(check.billing_period)} by the server). Bidding closes, and {bidderName} becomes the task owner:
            only they can split it from then on. This is a marketplace record, not a contract.
          </p>
          {check.remainder_after_minor !== null ? (
            <p>
              Your remainder on the task you split this piece from becomes{' '}
              <MoneyDisplay amountMinor={check.remainder_after_minor} currency={check.currency} />.
            </p>
          ) : null}
        </Callout>
      )}
      {check.is_above_listed_price && check.blocks.length === 0 ? (
        <Callout role="alert" title="Above your listed price" tone="warning">
          <p>
            This offer is above the <MoneyDisplay amountMinor={check.listed_price_minor ?? 0} currency={check.currency} /> you listed.
          </p>
          <Checkbox checked={isAboveConfirmed} label="Accept it anyway" onChange={(event) => setIsAboveConfirmed(event.target.checked)} />
        </Callout>
      ) : null}
      {error ? <Callout role="alert" title="Not accepted" tone="danger"><p>{error.message}</p></Callout> : null}
      <Button disabled={!check.can_accept || needsConfirmation} isBusy={isWorking} onClick={() => void accept()} size="lg" variant="primary">
        {isWorking ? 'Accepting…' : 'Accept and transfer ownership'}
      </Button>
      <Button onClick={() => (isReviewedOnOpen && onCancel ? onCancel() : setCheck(null))} size="sm" variant="ghost">Cancel</Button>
    </Stack>
  );
}
