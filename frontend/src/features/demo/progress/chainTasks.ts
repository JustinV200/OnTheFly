/* Finds the GovCon task chain's tasks in the three businesses' own My work responses (plan2, "Demo"): GovCon's DevSecOps
   REBID, Prime A's side of it once accepted, the piece Prime A splits off, and Sub B's side of that piece. Both the step
   script and the money views read the chain through here, so they can't disagree about which task is which. */
import type { WorkItem, WorkResponse } from '../../tasks/types';

export const GOVCON_ID = 'acc_govcon_1';
export const PRIME_A_ID = 'acc_prime_a';
export const SUB_B_ID = 'acc_sub_b';

export interface ChainViews {
  govcon: WorkResponse | null;
  prime: WorkResponse | null;
  sub: WorkResponse | null;
}

export interface ChainTasks {
  rebid: WorkItem | null;
  primeTask: WorkItem | null;
  piece: WorkItem | null;
  subTask: WorkItem | null;
  // Every chain task id, including pieces split further down; anything else a business has is outside the story.
  taskIds: ReadonlySet<string>;
}

/** Locate the chain's tasks; each is null until the business it concerns can see it. */
export function findChainTasks(views: ChainViews): ChainTasks {
  const rebid = views.govcon?.posted.find((item) => item.origin === 'rebid' && item.category === 'devsecops') ?? null;
  const primeTask = rebid ? views.prime?.owned.find((item) => item.task_id === rebid.task_id) ?? null : null;
  const piece = views.prime?.posted.find((item) => item.origin === 'split') ?? null;
  const subTask = piece ? views.sub?.owned.find((item) => item.task_id === piece.task_id) ?? null : null;

  // Work items carry no parent id, so pieces are recognised as splits posted by Prime A or Sub B. A demo reset deletes
  // every task those two posted or own, so in the staged demo their only splits come from this chain.
  const splitIds = [...(views.prime?.posted ?? []), ...(views.sub?.posted ?? [])]
    .filter((item) => item.origin === 'split')
    .map((item) => item.task_id);
  const taskIds = new Set([...(rebid ? [rebid.task_id] : []), ...splitIds]);

  return { rebid, primeTask, piece, subTask, taskIds };
}
