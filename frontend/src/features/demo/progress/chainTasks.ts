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
  // Every chain task id, including pieces split further down (found through each piece's parent link); anything else a
  // business has is outside the story.
  taskIds: ReadonlySet<string>;
}

/** Locate the chain's tasks; each is null until the business it concerns can see it. */
export function findChainTasks(views: ChainViews): ChainTasks {
  const rebid = views.govcon?.posted.find((item) => item.origin === 'rebid' && item.category === 'devsecops') ?? null;
  const primeTask = rebid ? views.prime?.owned.find((item) => item.task_id === rebid.task_id) ?? null : null;
  // A piece's poster owns its parent, so its work item names that parent (WorkItem.parent); Prime A's piece is its split
  // of the REBID. A business that only won a piece gets no parent, which is why the walk starts from the posters' side.
  const piece = rebid ? views.prime?.posted.find((item) => item.origin === 'split' && item.parent?.task_id === rebid.task_id) ?? null : null;
  const subTask = piece ? views.sub?.owned.find((item) => item.task_id === piece.task_id) ?? null : null;

  return { rebid, primeTask, piece, subTask, taskIds: chainTaskIds(rebid, views) };
}

// The REBID and every split below it, level by level: each business's posted splits whose parent is already in the chain.
function chainTaskIds(rebid: WorkItem | null, views: ChainViews): ReadonlySet<string> {
  const ids = new Set<string>(rebid ? [rebid.task_id] : []);
  const splits = [...(views.govcon?.posted ?? []), ...(views.prime?.posted ?? []), ...(views.sub?.posted ?? [])]
    .filter((item) => item.origin === 'split' && item.parent !== null);
  let isGrowing = ids.size > 0;
  while (isGrowing) {
    const next = splits.filter((item) => !ids.has(item.task_id) && ids.has(item.parent?.task_id ?? ''));
    next.forEach((item) => ids.add(item.task_id));
    isGrowing = next.length > 0;
  }
  return ids;
}
