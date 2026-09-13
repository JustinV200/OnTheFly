/* Works out whether the acting business posted a listing, so the ticket can offer "Offers" instead of a bid.
   The public listing projection deliberately doesn't name its poster, so this asks GET /api/listings/{id}/relationship,
   which answers only for the acting business and works for every task origin (a rebid, new work, or a piece). The backend
   still rejects a poster's bid; this only keeps the page from inviting one. Until the answer is known the ticket shows no
   bid form. */
import type { ApiError } from '../../../../shared/api/client';
import { useApiQuery } from '../../../../shared/api/useApiQuery';

// The relationship endpoint's answer (backend api/tasks/schemas.py ListingRelationshipResponse).
interface ListingRelationship {
  is_poster: boolean;
  // Only the poster learns the task behind its listing.
  task_id: string | null;
}

export type ListingOwnership =
  | { status: 'visitor' }
  | { status: 'checking' }
  | { status: 'owner'; taskId: string | null }
  | { status: 'not-owner' }
  | { status: 'unknown'; error: ApiError; retry: () => void };

/** Return the acting business's relationship to a listing. Not polled: AppShell remounts the page on an account
    switch, and publishing happens on another page. */
export function useListingOwnership(listingId: string, isSignedIn: boolean): ListingOwnership {
  const relationship = useApiQuery<ListingRelationship>(isSignedIn ? `/api/listings/${listingId}/relationship` : null);

  if (!isSignedIn) {
    return { status: 'visitor' };
  }
  if (relationship.data) {
    return relationship.data.is_poster ? { status: 'owner', taskId: relationship.data.task_id } : { status: 'not-owner' };
  }
  if (relationship.error) {
    return { status: 'unknown', error: relationship.error, retry: relationship.reload };
  }
  return { status: 'checking' };
}
