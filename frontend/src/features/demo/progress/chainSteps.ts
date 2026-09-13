/* Derives the demo script's progress from each business's own My work response (plan2, "Demo"). A step is done when the
   business it concerns can see that it happened; nothing here reads data a business couldn't read itself. */
import type { WorkItem } from '../../tasks/types';
import { ChainViews, findChainTasks, GOVCON_ID, PRIME_A_ID, SUB_B_ID } from './chainTasks';

export interface ChainStep {
  id: string;
  actorId: string;
  actorName: string;
  title: string;
  // The full instruction, shown on the demo guide.
  detail: string;
  // The same instruction in a few words, for the one-line rail under the top bar once the presenter is on the step's page.
  railDetail: string;
  isDone: boolean;
  // Where the actor should go next; null when the target doesn't exist yet.
  path: string | null;
  // Other pages that already count as being on this step (pages below path count too), e.g. the REBID form Spend opens.
  herePrefixes: string[];
}

/** Return the ordered steps with their status and links. */
export function chainSteps(views: ChainViews): ChainStep[] {
  const { rebid, primeTask: primeOwned, piece, subTask: subOwned } = findChainTasks(views);
  const isPublicOrLater = (item: WorkItem | null): boolean => item?.listing_visibility === 'public' || item?.state === 'accepted';

  return [
    {
      id: 'rebid',
      actorId: GOVCON_ID,
      actorName: 'GovCon Industries',
      title: 'REBID DevSecOps Support with requirements, then publish it',
      detail: 'Spend → DevSecOps Support → REBID… Fill with the demo scope, confirm, then preview and publish from the task page.',
      railDetail: rebid ? 'Preview and publish from the callout below.' : 'REBID… on DevSecOps Support, fill with the demo scope, confirm.',
      isDone: isPublicOrLater(rebid),
      path: rebid ? `/tasks/${rebid.task_id}` : '/',
      // Spend's REBID… opens the form, which is still this step until the task exists.
      herePrefixes: rebid ? [] : ['/tasks/new'],
    },
    {
      id: 'prime-bids',
      actorId: PRIME_A_ID,
      actorName: 'Prime A Federal Systems',
      title: 'Bid on the DevSecOps listing',
      detail: 'Open the market, answer every requirement, and submit an offer (for example $1,298,000 a year).',
      railDetail: 'Enter a price (e.g. $1,298,000 a year), include every requirement, submit.',
      isDone: Boolean(rebid && (rebid.offer_count > 0 || rebid.state === 'accepted')),
      path: rebid?.listing_id && rebid.listing_visibility === 'public' ? `/listings/${rebid.listing_id}` : '/marketplace',
      herePrefixes: [],
    },
    {
      id: 'govcon-accepts',
      actorId: GOVCON_ID,
      actorName: 'GovCon Industries',
      title: 'Accept Prime A’s offer: ownership moves',
      detail: 'Task page → Review offers → Accept… → Accept and transfer ownership. Prime A now owns the task; GovCon’s Split off turns disabled.',
      railDetail: 'Review offers → Accept… → Accept and transfer ownership.',
      isDone: rebid?.state === 'accepted',
      path: rebid ? `/tasks/${rebid.task_id}` : null,
      herePrefixes: [],
    },
    {
      id: 'prime-splits',
      actorId: PRIME_A_ID,
      actorName: 'Prime A Federal Systems',
      title: 'Open Ways to save and split off the suggested piece',
      detail: 'Priced from Prime A’s own internal rates against market evidence. Split off takes the suggested cut.',
      railDetail: 'Ways to save → Split off this piece → Split off this piece.',
      isDone: (primeOwned?.owner_money?.pieces.length ?? 0) > 0,
      path: primeOwned ? `/tasks/${primeOwned.task_id}` : null,
      herePrefixes: [],
    },
    {
      id: 'prime-publishes',
      actorId: PRIME_A_ID,
      actorName: 'Prime A Federal Systems',
      title: 'Preview and publish the piece',
      detail: 'The preview shows no GovCon name, no parent task and no accepted price. The cut stays hidden by default.',
      railDetail: 'Preview and publish; the preview names no client and shows no price.',
      isDone: isPublicOrLater(piece),
      path: piece ? `/tasks/${piece.task_id}` : null,
      herePrefixes: [],
    },
    {
      id: 'sub-bids',
      actorId: SUB_B_ID,
      actorName: 'Sub B Compliance Partners',
      title: 'Bid on the piece',
      detail: 'Sub B sees a Subcontract listing with its price not disclosed, and bids (for example $219,000 a year).',
      railDetail: 'A Subcontract market, price not disclosed. Bid e.g. $219,000 a year.',
      isDone: Boolean(piece && (piece.offer_count > 0 || piece.state === 'accepted')),
      path: piece?.listing_id && piece.listing_visibility === 'public' ? `/listings/${piece.listing_id}` : '/marketplace',
      herePrefixes: [],
    },
    {
      id: 'prime-accepts',
      actorId: PRIME_A_ID,
      actorName: 'Prime A Federal Systems',
      title: 'Accept Sub B’s offer',
      detail: 'The difference under the cut returns to Prime A’s remainder.',
      railDetail: 'Review offers → Accept…; the difference under the cut returns to the remainder.',
      isDone: piece?.state === 'accepted',
      path: piece ? `/tasks/${piece.task_id}` : null,
      herePrefixes: [],
    },
    {
      id: 'sub-owns',
      actorId: SUB_B_ID,
      actorName: 'Sub B Compliance Partners',
      title: 'Sub B owns the piece and sees its own Split button',
      // Shown on the rail too, away from the guide, so it points at the money views rather than saying "below".
      detail: 'The new owner can split again. The demo guide’s money views show each business’s own figures.',
      railDetail: 'Sub B can split again. The demo guide shows the three money views.',
      isDone: Boolean(subOwned),
      path: subOwned ? `/tasks/${subOwned.task_id}` : null,
      herePrefixes: [],
    },
  ];
}
