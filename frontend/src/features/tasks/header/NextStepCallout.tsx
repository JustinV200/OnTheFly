/* One sentence on what this participant can do next with the task, so the demo reads as a story on every screen.
   It only points at controls further down the page; it never acts or decides anything by itself. */
import type { ReactNode } from 'react';

import { Button, Callout } from '../../../shared/ui';
import type { TaskDetail } from '../types';

interface NextStepCalloutProps {
  task: TaskDetail;
  onOpenTab: (tabId: string) => void;
  onSplit: () => void;
}

/** Render the next-step callout, or nothing when there is no obvious step. */
export function NextStepCallout({ task, onOpenTab, onSplit }: NextStepCalloutProps): JSX.Element | null {
  const step = nextStep(task, onOpenTab, onSplit);
  if (!step) {
    return null;
  }
  return (
    <Callout actions={step.action} role="note" title={step.title} tone="brand">
      <p>{step.body}</p>
    </Callout>
  );
}

interface Step {
  title: string;
  body: string;
  action: ReactNode;
}

function nextStep(task: TaskDetail, onOpenTab: (tabId: string) => void, onSplit: () => void): Step | null {
  const listing = task.listing;
  if (task.relationship === 'owner') {
    const hasPieces = task.pieces.length > 0;
    return {
      title: hasPieces ? 'You own this task and have split pieces off' : 'You own this task now',
      body: hasPieces
        ? 'Publish each private piece, accept an offer on it, and watch your remainder. Ways to save updates as requirements move.'
        : 'Open Ways to save to see which pieces market evidence says are cheaper to split off, priced from your own rates.',
      action: (
        <>
          <Button onClick={() => onOpenTab('savings')} variant="primary">Ways to save</Button>
          <Button onClick={onSplit}>Split off manually</Button>
        </>
      ),
    };
  }
  if (task.relationship === 'poster') {
    return {
      title: 'Ownership moved to your accepted bidder',
      body: 'You stay the client. The bidder is responsible for the work and is the only one who can split it; you see nothing of the pieces they subcontract.',
      action: <Button onClick={() => onOpenTab('money')}>See your money view</Button>,
    };
  }
  if (!listing) {
    return null;
  }
  if (listing.visibility === 'private' || listing.visibility === 'scope_confirmed' || listing.visibility === 'closed') {
    return {
      title: listing.visibility === 'scope_confirmed' ? 'Preview and publish when ready' : 'This task is private',
      body: 'Nothing is public until you preview the exact payload strangers will see and publish it.',
      action: <Button onClick={() => onOpenTab('listing')} variant="primary">Preview and publish</Button>,
    };
  }
  if (listing.offer_count > 0) {
    return {
      title: `${listing.offer_count} offer${listing.offer_count === 1 ? '' : 's'} waiting`,
      body: 'Accept one to close bidding and hand the task to that bidder. Before accepting, you can still split pieces off yourself.',
      action: <Button onClick={() => onOpenTab('listing')} variant="primary">Review offers</Button>,
    };
  }
  return {
    title: 'Public and waiting for offers',
    body: 'Other businesses can bid now. You can also look for pieces worth splitting off first.',
    action: <Button onClick={() => onOpenTab('savings')}>Ways to save</Button>,
  };
}
