/* Tells the bid page whether the acting business posted this listing, so a poster never sees a bid form for it
   (CLAUDE.md: "An owner cannot bid on their own listing"). The server rejects such an offer anyway; this keeps the
   poster from typing one. It asks the listing relationship endpoint, which covers rebids, new tasks and pieces alike,
   because public listing payloads deliberately carry no poster. */
import type { ApiError } from '../../../shared/api/client';
import { useApiQuery } from '../../../shared/api/useApiQuery';

export interface OwnListingCheck {
  // null until the check has an answer (loading or failed); the page shows no form meanwhile.
  isOwnListing: boolean | null;
  error: ApiError | null;
  reload: () => void;
}

/** Check whether the acting business posted listingId; skipped (and null) when there is no acting business. */
export function useOwnListingCheck(listingId: string, hasActingAccount: boolean): OwnListingCheck {
  const relationship = useApiQuery<{ is_poster: boolean }>(hasActingAccount ? `/api/listings/${listingId}/relationship` : null);
  const isOwnListing = relationship.data ? relationship.data.is_poster : null;
  return { isOwnListing, error: relationship.error, reload: relationship.reload };
}
