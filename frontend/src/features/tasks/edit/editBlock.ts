/* Says whether the acting business can edit a task's scope right now, and why not. It mirrors the server's refusals
   (only the poster edits; an accepted scope is fixed; new work and pieces must be unpublished first) so the page
   explains them up front; the server still enforces every one. */
import type { TaskDetail } from '../types';

export type EditBlock =
  | { kind: 'not_poster' }
  | { kind: 'accepted' }
  | { kind: 'unpublish_first'; listingId: string }
  | null;

/** Return why editing is blocked, or null when the poster can edit. */
export function editBlock(task: TaskDetail): EditBlock {
  if (!task.is_posted_by_you) {
    return { kind: 'not_poster' };
  }
  if (task.relationship === 'poster') {
    // The poster alone, not also the owner, means ownership moved on through an accepted offer.
    return { kind: 'accepted' };
  }
  // A REBID's confirm step takes a public listing back to review itself; new work and pieces refuse while public.
  if (task.origin !== 'rebid' && task.listing?.visibility === 'public') {
    return { kind: 'unpublish_first', listingId: task.listing.id };
  }
  return null;
}
