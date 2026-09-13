/* Arranges My work so each piece sits under the task it was split from. The link is the item's own parent reference,
   which the server sends only to an account that posted or owns that parent (services/tasks/views/parent_ref.py), so a
   piece's winner sees it at the top level with no hint of where it came from. Nothing is dropped: a piece whose parent
   isn't on this page stays at the top of its own section. */
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
  const all = [...work.owned, ...work.posted];
  const shownIds = new Set(all.map((item) => item.task_id));
  const isNested = (item: WorkItem): boolean => item.parent !== null && item.parent.task_id !== item.task_id && shownIds.has(item.parent.task_id);

  const build = (item: WorkItem, ancestors: Set<string>): WorkNode => {
    const path = new Set(ancestors).add(item.task_id);
    const pieces = all
      // The ancestor check guards against a malformed response that makes a task its own descendant.
      .filter((child) => child.parent?.task_id === item.task_id && !path.has(child.task_id))
      .map((child) => build(child, path));
    return { item, pieces };
  };

  return {
    owned: work.owned.filter((item) => !isNested(item)).map((item) => build(item, new Set())),
    posted: work.posted.filter((item) => !isNested(item)).map((item) => build(item, new Set())),
  };
}
