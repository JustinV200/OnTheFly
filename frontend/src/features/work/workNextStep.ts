/* The next-step line on a My work card, derived from the item's own fields with the same meaning as the task page's
   next-step callout (tasks/nextStep/nextStep.ts): publish, review offers, a piece that needs you, or who owns it now.
   Falls back to the server's next_step text when the fields don't settle it. Words only; it never acts. */
import { firstPieceNeedingAction } from '../tasks/pieces/pieceNextAction';
import type { PieceLine, WorkItem } from '../tasks/types';

/** Return the card's next-step sentence, or null when there is nothing to suggest. */
export function workNextStep(item: WorkItem): string | null {
  // Reviewing a changed parent scope comes first, as on the task page: nothing on the piece was rewritten to match.
  if (item.parent_scope_changed_at !== null) {
    return 'The task this piece came from changed its scope: review';
  }
  if (item.relationship === 'owner') {
    return pieceStep(item.owner_money?.pieces ?? []) ?? (
      (item.owner_money?.pieces.length ?? 0) > 0 ? 'No piece needs you: look for more Ways to save' : 'Open Ways to save to find pieces worth splitting off'
    );
  }
  if (item.relationship === 'poster') {
    const bidder = item.buyer_money?.accepted_bidder?.business_name ?? 'Your accepted bidder';
    return pieceStep(item.buyer_money?.own_pieces ?? []) ?? `${bidder} owns it now; only they can split it`;
  }
  if (item.relationship === 'poster_and_owner') {
    return posterStep(item) ?? item.next_step;
  }
  return item.next_step;
}

function posterStep(item: WorkItem): string | null {
  const visibility = item.listing_visibility;
  const pieces = item.buyer_money?.own_pieces ?? [];
  if (visibility === null) {
    return 'No listing yet: edit its scope';
  }
  if (visibility === 'closed') {
    return item.origin === 'split' ? 'Closed: its split was undone' : 'Bidding closed: preview and publish to reopen';
  }
  if (visibility !== 'public' && visibility !== 'shortlisted') {
    if (item.origin === 'rebid' && visibility !== 'scope_confirmed') {
      return 'Private: confirm this REBID’s scope';
    }
    return visibility === 'scope_confirmed' ? 'Scope confirmed: preview and publish' : 'Private: preview and publish';
  }
  if (item.offer_count > 0) {
    return `${item.offer_count} offer${item.offer_count === 1 ? '' : 's'} waiting: review and accept`;
  }
  if (visibility === 'shortlisted') {
    return 'Shortlisted, with no active offers';
  }
  return pieceStep(pieces) ?? 'Public: waiting for offers';
}

function pieceStep(pieces: PieceLine[]): string | null {
  const pending = firstPieceNeedingAction(pieces);
  if (!pending) {
    return null;
  }
  const title = pending.piece.title ?? 'your untitled piece';
  return pending.action.kind === 'review_offers' ? `Review offers on ${title}` : `Publish ${title}`;
}
