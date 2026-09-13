/* The one next action on a piece its viewer split off, read from the piece line the server sent: publish it, review its
   offers, wait, or nothing (accepted, closed). Shared by the piece rows, the task page's next-step callout and My work,
   so all three say the same thing. It only names the step; it never acts. */
import type { PieceLine } from '../types';

export type PieceActionKind = 'publish' | 'review_offers' | 'waiting' | 'accepted' | 'closed';

export interface PieceAction {
  kind: PieceActionKind;
  // Short words for a button or status, e.g. "Publish", "Review offers (2)", "Accepted by Sub B Compliance Partners".
  label: string;
  // True when the piece's poster has something to do now (publish or review offers).
  isNeeded: boolean;
}

/** Return the next action for one piece. */
export function pieceNextAction(piece: PieceLine): PieceAction {
  if (piece.accepted_bidder || piece.status === 'accepted') {
    return { kind: 'accepted', label: `Accepted by ${piece.accepted_bidder?.business_name ?? 'a bidder'}`, isNeeded: false };
  }
  if (piece.status === 'closed' || piece.listing_visibility === 'closed') {
    return { kind: 'closed', label: 'Closed', isNeeded: false };
  }
  // Active offers can be reviewed on a public or shortlisted listing; an unpublished one keeps them too.
  if (piece.offer_count > 0) {
    return { kind: 'review_offers', label: `Review offers (${piece.offer_count})`, isNeeded: true };
  }
  if (piece.listing_visibility === 'public') {
    return { kind: 'waiting', label: 'Waiting for offers', isNeeded: false };
  }
  // Private, scope confirmed, or no listing state reported: the piece isn't public, so publishing is the step.
  return { kind: 'publish', label: 'Publish', isNeeded: true };
}

/** Return the first piece whose poster has something to do, with its action, or null when none does. */
export function firstPieceNeedingAction(pieces: PieceLine[]): { piece: PieceLine; action: PieceAction } | null {
  for (const piece of pieces) {
    const action = pieceNextAction(piece);
    if (action.isNeeded) {
      return { piece, action };
    }
  }
  return null;
}
