/* Tells the bid page whether the acting business owns this listing, so an owner never sees a bid form for it
   (CLAUDE.md: "An owner cannot bid on their own listing"). The server rejects such an offer anyway; this keeps the
   owner from typing one. It reads the business's own expenses, whose listing_id links an expense to its listing,
   because public listing payloads deliberately carry no owner. */
import type { ApiError } from '../../../shared/api/client';
import { useApiQuery } from '../../../shared/api/useApiQuery';
import type { ExpenseListResponse } from '../../dashboard/types';

export interface OwnListingCheck {
  // null until the check has an answer (loading or failed); the page shows no form meanwhile.
  isOwnListing: boolean | null;
  error: ApiError | null;
  reload: () => void;
}

/** Check listingId against the acting business's expenses; skipped (and null) when there is no acting business. */
export function useOwnListingCheck(listingId: string, hasActingAccount: boolean): OwnListingCheck {
  const expenses = useApiQuery<ExpenseListResponse>(hasActingAccount ? '/api/expenses' : null);
  const isOwnListing = expenses.data ? expenses.data.expenses.some((expense) => expense.listing_id === listingId) : null;
  return { isOwnListing, error: expenses.error, reload: expenses.reload };
}
