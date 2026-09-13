/* Which tab a task page opens on, from the viewer's relationship: an owner that won the task lands on Ways to save (the
   primary action on a task it owns, roadmap 12 step 9); a poster that still owns its listing on Listing & offers; a
   client after acceptance on Overview, where its money and the new owner are. */
import type { TaskDetail } from '../types';

export type TaskTabId = 'overview' | 'savings' | 'listing' | 'details';

/** Return the default tab id for the task. */
export function defaultTabId(task: TaskDetail): TaskTabId {
  if (task.relationship === 'owner') {
    return 'savings';
  }
  if (task.relationship === 'poster_and_owner' && task.state !== 'accepted') {
    return 'listing';
  }
  return 'overview';
}
