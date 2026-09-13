/* Derives the demo script's progress from each business's own My work response (plan2, "Demo"). A step is done when the
   business it concerns can see that it happened; nothing here reads data a business couldn't read itself. */
import type { WorkItem, WorkResponse } from '../tasks/types';

export const GOVCON_ID = 'acc_govcon_1';
export const PRIME_A_ID = 'acc_prime_a';
export const SUB_B_ID = 'acc_sub_b';

export interface ChainStep {
  id: string;
  actorId: string;
  actorName: string;
  title: string;
  detail: string;
  isDone: boolean;
  // Where the actor should go next; null when the target doesn't exist yet.
  path: string | null;
}

export interface ChainViews {
  govcon: WorkResponse | null;
  prime: WorkResponse | null;
  sub: WorkResponse | null;
}

/** Return the ordered steps with their status and links. */
export function chainSteps(views: ChainViews): ChainStep[] {
  const rebid = views.govcon?.posted.find((item) => item.origin === 'rebid' && item.category === 'devsecops') ?? null;
  const primeOwned = rebid ? views.prime?.owned.find((item) => item.task_id === rebid.task_id) ?? null : null;
  const piece = views.prime?.posted.find((item) => item.origin === 'split') ?? null;
  const subOwned = piece ? views.sub?.owned.find((item) => item.task_id === piece.task_id) ?? null : null;
  const isPublicOrLater = (item: WorkItem | null): boolean => item?.listing_visibility === 'public' || item?.state === 'accepted';

  return [
    {
      id: 'rebid',
      actorId: GOVCON_ID,
      actorName: 'GovCon Industries',
      title: 'REBID DevSecOps Support with requirements, then publish it',
      detail: 'Spend → DevSecOps Support → REBID… Fill with the demo scope, confirm, then preview and publish from the task page.',
      isDone: isPublicOrLater(rebid),
      path: rebid ? `/tasks/${rebid.task_id}` : '/',
    },
    {
      id: 'prime-bids',
      actorId: PRIME_A_ID,
      actorName: 'Prime A Federal Systems',
      title: 'Bid on the DevSecOps listing',
      detail: 'Open the market, answer every requirement, and submit an offer (for example $1,298,000 a year).',
      isDone: Boolean(rebid && (rebid.offer_count > 0 || rebid.state === 'accepted')),
      path: rebid?.listing_id && rebid.listing_visibility === 'public' ? `/listings/${rebid.listing_id}` : '/marketplace',
    },
    {
      id: 'govcon-accepts',
      actorId: GOVCON_ID,
      actorName: 'GovCon Industries',
      title: 'Accept Prime A’s offer: ownership moves',
      detail: 'Task page → Listing & offers → Accept…. GovCon’s Split button disappears; Prime A now owns the task.',
      isDone: rebid?.state === 'accepted',
      path: rebid ? `/tasks/${rebid.task_id}` : null,
    },
    {
      id: 'prime-splits',
      actorId: PRIME_A_ID,
      actorName: 'Prime A Federal Systems',
      title: 'Open Ways to save and split off the suggested piece',
      detail: 'Priced from Prime A’s own internal rates against market evidence. Split off takes the suggested cut.',
      isDone: (primeOwned?.owner_money?.pieces.length ?? 0) > 0,
      path: primeOwned ? `/tasks/${primeOwned.task_id}` : null,
    },
    {
      id: 'prime-publishes',
      actorId: PRIME_A_ID,
      actorName: 'Prime A Federal Systems',
      title: 'Preview and publish the piece',
      detail: 'The preview shows no GovCon name, no parent task and no accepted price. The cut stays hidden by default.',
      isDone: isPublicOrLater(piece),
      path: piece ? `/tasks/${piece.task_id}` : null,
    },
    {
      id: 'sub-bids',
      actorId: SUB_B_ID,
      actorName: 'Sub B Compliance Partners',
      title: 'Bid on the piece',
      detail: 'Sub B sees a Subcontract listing with its price not disclosed, and bids (for example $219,000 a year).',
      isDone: Boolean(piece && (piece.offer_count > 0 || piece.state === 'accepted')),
      path: piece?.listing_id && piece.listing_visibility === 'public' ? `/listings/${piece.listing_id}` : '/marketplace',
    },
    {
      id: 'prime-accepts',
      actorId: PRIME_A_ID,
      actorName: 'Prime A Federal Systems',
      title: 'Accept Sub B’s offer',
      detail: 'The difference under the cut returns to Prime A’s remainder.',
      isDone: piece?.state === 'accepted',
      path: piece ? `/tasks/${piece.task_id}` : null,
    },
    {
      id: 'sub-owns',
      actorId: SUB_B_ID,
      actorName: 'Sub B Compliance Partners',
      title: 'Sub B owns the piece and sees its own Split button',
      detail: 'The new owner can split again. Every money view below reconciles.',
      isDone: Boolean(subOwned),
      path: subOwned ? `/tasks/${subOwned.task_id}` : null,
    },
  ];
}
