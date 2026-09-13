/* Saves an edited scope through the endpoint for the task's origin: a REBID confirms its scope again through the expense
   flow (POST /api/tasks/rebid), while new work and pieces write a new version (PUT /api/tasks/:id/scope). Both write a
   new scope version and leave the listing unpublished until its poster previews and publishes again. */
import { post, put } from '../../../shared/api/client';
import type { TaskScopeDraftPayload } from '../new/draft/draftTypes';
import type { TaskDetail } from '../types';

/** Send the draft and resolve with the task as it now stands. Assumes the caller checked the task can be edited. */
export function saveTaskScope(task: TaskDetail, draft: TaskScopeDraftPayload, biddingMode: 'sealed' | 'open'): Promise<TaskDetail> {
  if (task.origin === 'rebid') {
    return post<TaskDetail>('/api/tasks/rebid', { expense_id: task.expense_id, draft, choices: { bidding_mode: biddingMode } });
  }
  return put<TaskDetail>(`/api/tasks/${task.id}/scope`, draft);
}
