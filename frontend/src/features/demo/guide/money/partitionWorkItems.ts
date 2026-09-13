/* Splits one business's My work response into the task chain's items and a count of everything else, so the money views
   show only the story's tasks and summarize the rest in one line instead of silently dropping them. */
import type { WorkItem, WorkResponse } from '../../../tasks/types';

export interface PartitionedWork {
  chainItems: WorkItem[];
  // Distinct tasks outside the chain (a task this business both posted and owns counts once).
  otherTaskCount: number;
}

/** Partition a response by chain task id; null while the response hasn't loaded. */
export function partitionWorkItems(response: WorkResponse | null, chainTaskIds: ReadonlySet<string>): PartitionedWork | null {
  if (response === null) {
    return null;
  }
  const items = [...response.owned, ...response.posted];
  // The same task can appear in both lists with the same relationship; show it once.
  const unique = items.filter(
    (item, index) => items.findIndex((other) => other.task_id === item.task_id && other.relationship === item.relationship) === index,
  );
  const otherTaskIds = new Set(unique.filter((item) => !chainTaskIds.has(item.task_id)).map((item) => item.task_id));
  return {
    chainItems: unique.filter((item) => chainTaskIds.has(item.task_id)),
    otherTaskCount: otherTaskIds.size,
  };
}
