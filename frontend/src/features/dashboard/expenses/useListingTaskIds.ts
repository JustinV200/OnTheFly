/* Finds the task behind each of the acting business's listings, so a Spend row whose expense was already REBID can open
   its task instead of starting another REBID. The expense list carries only listing_id, so this reads My work's posted
   tasks (GET /api/work) once, which pairs each listing with its task. Lookup only; nothing here decides visibility. */
import { useMemo } from 'react';

import { useApiQuery } from '../../../shared/api/useApiQuery';
import type { WorkResponse } from '../../tasks/types';

/** Return listing id → task id for the tasks this business posted; empty while loading or when the request failed.
    A missing entry only means the row keeps its REBID or publish action, which still works on its own. */
export function useListingTaskIds(): ReadonlyMap<string, string> {
  const work = useApiQuery<WorkResponse>('/api/work');

  return useMemo(() => {
    const byListing = new Map<string, string>();
    for (const item of work.data?.posted ?? []) {
      if (item.listing_id) {
        byListing.set(item.listing_id, item.task_id);
      }
    }
    return byListing;
  }, [work.data]);
}
