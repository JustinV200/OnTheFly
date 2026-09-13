/* Works out whether the acting business owns a listing, so the ticket can offer "Manage offers" instead of a bid.
   The public listing projection deliberately doesn't name its owner, so this reads the acting business's own
   /api/expenses, whose rows carry the listing_id of anything it published. The backend still rejects an owner's bid;
   this only keeps the page from inviting one. Until the answer is known the ticket shows no bid form. */
import type { ApiError } from '../../../../shared/api/client';
import { useApiQuery } from '../../../../shared/api/useApiQuery';

// The only part of the /api/expenses response read here. Kept local rather than importing the dashboard's type, so
// changes to the dashboard's expense shape don't ripple into the marketplace.
interface OwnExpensesResponse {
  expenses: Array<{ listing_id: string | null }>;
}

export type ListingOwnership =
  | { status: 'visitor' }
  | { status: 'checking' }
  | { status: 'owner' }
  | { status: 'not-owner' }
  | { status: 'unknown'; error: ApiError; retry: () => void };

/** Return the acting business's relationship to a listing. Not polled: AppShell remounts the page on an account
    switch, and publishing happens on another page. */
export function useListingOwnership(listingId: string, isSignedIn: boolean): ListingOwnership {
  const expenses = useApiQuery<OwnExpensesResponse>(isSignedIn ? '/api/expenses' : null);

  if (!isSignedIn) {
    return { status: 'visitor' };
  }
  if (expenses.data) {
    return expenses.data.expenses.some((expense) => expense.listing_id === listingId) ? { status: 'owner' } : { status: 'not-owner' };
  }
  if (expenses.error) {
    return { status: 'unknown', error: expenses.error, retry: expenses.reload };
  }
  return { status: 'checking' };
}
