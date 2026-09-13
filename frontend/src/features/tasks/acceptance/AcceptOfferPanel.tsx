/* Accepting one offer, in two explicit steps: "Review acceptance" loads the server's check (anything that blocks it, an
   above-price warning, the remainder it leaves), then "Accept and transfer ownership" does it. Acceptance closes bidding
   and makes the bidder the task owner; it is a marketplace record, not a contract (CLAUDE.md). Nothing here decides a
   block or computes a figure: the server's check says, and the accept endpoint enforces it again. */
import { useState } from 'react';

import { ApiError } from '../../../shared/api/client';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import { Button, Callout, Checkbox, Icon, Stack } from '../../../shared/ui';
import type { TaskDetail } from '../types';
import { AcceptanceCheck, acceptOffer, checkAcceptance } from './acceptanceApi';

interface AcceptOfferPanelProps {
  taskId: string;
  challengeId: string;
  bidderName: string;
  onAccepted: (task: TaskDetail) => void;
}

/** Render the review-then-accept control for one offer. */
export function AcceptOfferPanel({ taskId, challengeId, bidderName, onAccepted }: AcceptOfferPanelProps): JSX.Element {
  const [check, setCheck] = useState<AcceptanceCheck | null>(null);
  const [isAboveConfirmed, setIsAboveConfirmed] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
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
    return (
      <Stack gap={2}>
        <Button iconStart={<Icon name="check-circle" />} isBusy={isWorking} onClick={() => void review()} variant="primary">
          {isWorking ? 'Checking…' : `Review accepting ${bidderName}’s offer`}
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
            (restated per {check.billing_period} period by the server). Bidding closes, and {bidderName} becomes the task owner:
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
      <Button onClick={() => setCheck(null)} size="sm" variant="ghost">Cancel</Button>
    </Stack>
  );
}
