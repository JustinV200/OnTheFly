/* Arranges My work so each piece this business split off sits under the task it came from. WorkItem has no parent
   link, but a parent lists its pieces' task ids (owner_money.pieces after acceptance, buyer_money.own_pieces before), and
   this business posted every one of those pieces, so they are found in the posted list. Nothing is dropped: an item no
   listed parent claims stays at the top of its own section. */
import type { WorkItem, WorkResponse } from '../tasks/types';

export interface WorkNode {
  item: WorkItem;
  pieces: WorkNode[];
}

export interface NestedWork {
  owned: WorkNode[];
  posted: WorkNode[];
}

/** Return both sections with pieces nested under their parents, keeping the server's newest-first order. */
export function nestWorkPieces(work: WorkResponse): NestedWork {
  const postedById = new Map(work.posted.map((item) => [item.task_id, item]));
  // Parents are drawn from the page's own items, so a nested piece always has its parent on the page to sit under.
  const nestedIds = new Set([...work.owned, ...work.posted].flatMap(pieceIdsOf).filter((id) => postedById.has(id)));

  const build = (item: WorkItem, ancestors: Set<string>): WorkNode => {
    const path = new Set(ancestors).add(item.task_id);
    const pieces = pieceIdsOf(item)
      .map((id) => postedById.get(id))
      // The ancestor check guards against a malformed response that lists a task as its own descendant.
      .filter((child): child is WorkItem => child !== undefined && !path.has(child.task_id))
      .map((child) => build(child, path));
    return { item, pieces };
  };

  return {
    owned: work.owned.filter((item) => !nestedIds.has(item.task_id)).map((item) => build(item, new Set())),
    posted: work.posted.filter((item) => !nestedIds.has(item.task_id)).map((item) => build(item, new Set())),
  };
}

function pieceIdsOf(item: WorkItem): string[] {
  return [...(item.owner_money?.pieces ?? []), ...(item.buyer_money?.own_pieces ?? [])].map((piece) => piece.task_id);
}
