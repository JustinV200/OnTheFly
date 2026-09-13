/* Decides the task page's next step from the task detail alone: a title, a sentence, one primary action that performs
   the step, and quieter secondary actions. Pure, so every state is covered in one place (no listing, private REBID,
   private, confirmed, closed, shortlisted, offers waiting, public, owner with pieces, client after acceptance). Actions
   are descriptors; NextStepCallout wires them to the drawer, tabs and links. Nothing here computes money. */
import { firstPieceNeedingAction } from '../pieces/pieceNextAction';
import type { TaskDetail } from '../types';

export type StepAction =
  | { kind: 'publish'; label: string }
  | { kind: 'reviewOffers'; label: string }
  | { kind: 'waysToSave'; label: string }
  | { kind: 'splitManually'; label: string }
  | { kind: 'details'; label: string }
  | { kind: 'link'; label: string; to: string }
  | { kind: 'splitBlocked'; label: string; reason: string };

export interface NextStep {
  title: string;
  body: string;
  primary: StepAction | null;
  secondary: StepAction[];
}

/** Return the next step for the viewer, or null when there is none to suggest. */
export function nextStep(task: TaskDetail): NextStep | null {
  if (task.relationship === 'poster') {
    return clientStep(task);
  }
  if (task.relationship === 'owner') {
    return ownerStep(task);
  }
  return posterStep(task);
}

function clientStep(task: TaskDetail): NextStep {
  const ownerName = task.buyer_money?.accepted_bidder?.business_name ?? null;
  const pieceLink = pieceStepAction(task);
  return {
    title: ownerName ? `${ownerName} owns this task now` : 'Ownership moved to your accepted bidder',
    body: `You stay the client. ${ownerName ?? 'The bidder'} is responsible for the work and is the only one who can split it; you see nothing of the pieces they split off.`,
    // Nothing is left for the client to do here, so the enabled action shows the proof: the audit trail on Details.
    primary: pieceLink ?? { kind: 'details', label: 'See the audit trail' },
    secondary: [{
      kind: 'splitBlocked',
      label: 'Split off',
      reason: ownerName ? `Only ${ownerName} can split this now.` : task.split_block_reason ?? 'Only the current task owner can split it.',
    }],
  };
}

function ownerStep(task: TaskDetail): NextStep {
  const pending = firstPieceNeedingAction(task.pieces);
  const splitManually: StepAction[] = task.can_split ? [{ kind: 'splitManually', label: 'Split off a piece' }] : [];
  if (pending) {
    const isReview = pending.action.kind === 'review_offers';
    return {
      title: isReview ? `Offers waiting on ${pieceTitle(pending.piece.title)}` : `${pieceTitle(pending.piece.title)} is still private`,
      body: isReview
        ? 'Accepting an offer makes that bidder the piece’s owner, and its accepted price replaces the cut in your remainder.'
        : 'Publish it so other businesses can bid. Your remainder already counts its cut.',
      primary: pieceStepAction(task),
      secondary: [{ kind: 'waysToSave', label: 'Ways to save' }, ...splitManually],
    };
  }
  if (!task.can_split) {
    return {
      title: 'You own this task',
      body: task.split_block_reason ?? 'Splitting isn’t available on this task right now.',
      primary: { kind: 'waysToSave', label: 'Ways to save' },
      secondary: [],
    };
  }
  const hasPieces = task.pieces.length > 0;
  return {
    title: hasPieces ? 'No piece needs you right now' : 'You own this task now',
    body: hasPieces
      ? 'Your pieces are public or accepted. Look for more pieces worth splitting off, or follow your remainder on Overview.'
      : 'Ways to save shows which pieces market evidence says are cheaper to split off, priced from your own rates.',
    primary: { kind: 'waysToSave', label: 'Ways to save' },
    secondary: splitManually,
  };
}

function posterStep(task: TaskDetail): NextStep | null {
  const listing = task.listing;
  const editScope: StepAction = { kind: 'link', label: 'Edit scope', to: `/tasks/${task.id}/edit` };
  const pieceLinks = pieceStepAction(task);
  if (!listing) {
    return { title: 'No listing yet', body: 'Nobody can see or bid on this task until it has a listing. Start by editing its scope.', primary: editScope, secondary: [] };
  }
  const visibility = listing.visibility;
  if (visibility === 'closed') {
    return task.origin === 'split'
      ? {
        title: 'This piece is closed',
        body: 'Its split was undone: the cut and requirements went back to the task it came from. It is out of public view, and any offers it received are kept.',
        primary: { kind: 'link', label: 'Back to My work', to: '/work' },
        secondary: [],
      }
      : {
        title: 'Bidding is closed',
        body: 'This listing is out of public view, and the offers it received are kept. Confirm, preview and publish to open it again.',
        primary: { kind: 'publish', label: 'Preview and publish' },
        secondary: [],
      };
  }
  if (visibility !== 'public' && visibility !== 'shortlisted') {
    if (task.origin === 'rebid' && visibility !== 'scope_confirmed') {
      return {
        title: 'Confirm this REBID’s scope',
        body: 'Nothing is public. Confirm the requirements and what you pay now; then you can preview exactly what strangers will see.',
        primary: { kind: 'link', label: 'Confirm scope', to: `/tasks/${task.id}/edit` },
        secondary: pieceLinks ? [pieceLinks] : [],
      };
    }
    return {
      title: visibility === 'scope_confirmed' ? 'Scope confirmed: preview and publish' : 'This task is private',
      body: visibility === 'scope_confirmed'
        ? 'Still private. Preview the exact listing strangers will see, then publish it.'
        : 'Nothing is public until you confirm what goes public, preview the exact listing strangers will see, and publish it.',
      primary: { kind: 'publish', label: 'Preview and publish' },
      secondary: pieceLinks ? [pieceLinks] : [],
    };
  }
  if (listing.offer_count > 0) {
    const count = listing.offer_count;
    return {
      title: `${count} offer${count === 1 ? '' : 's'} waiting`,
      body: 'Accept one to close bidding and hand the task to that bidder. Before accepting, you can still split pieces off yourself.',
      primary: { kind: 'reviewOffers', label: 'Review offers' },
      secondary: [{ kind: 'waysToSave', label: 'Ways to save' }],
    };
  }
  if (visibility === 'shortlisted') {
    return {
      title: 'Shortlisted, with no active offers',
      body: 'Bidding is closed while offers are reviewed, but none is active now: each was withdrawn or replaced.',
      primary: { kind: 'reviewOffers', label: 'Open your listing' },
      secondary: [],
    };
  }
  if (pieceLinks) {
    return {
      title: 'Public: one of your pieces needs you',
      body: 'Other businesses can bid on this task now. Meanwhile, a piece you split off is waiting on you.',
      primary: pieceLinks,
      secondary: [{ kind: 'waysToSave', label: 'Ways to save' }],
    };
  }
  return {
    title: 'Public and waiting for offers',
    body: 'Other businesses can bid now. Meanwhile, you can look for pieces worth splitting off first.',
    primary: { kind: 'waysToSave', label: 'Ways to save' },
    // "View as a stranger" stays on the listing card; repeating it here only adds a third copy.
    secondary: [],
  };
}

// "Publish ATO package" / "Review offers on ATO package", linking to the first piece whose poster has something to do.
function pieceStepAction(task: TaskDetail): StepAction | null {
  const pending = firstPieceNeedingAction(task.pieces);
  if (!pending) {
    return null;
  }
  const title = pieceTitle(pending.piece.title);
  const label = pending.action.kind === 'review_offers' ? `Review offers on ${title}` : `Publish ${title}`;
  return { kind: 'link', label, to: `/tasks/${pending.piece.task_id}` };
}

function pieceTitle(title: string | null): string {
  return title ?? 'your untitled piece';
}
