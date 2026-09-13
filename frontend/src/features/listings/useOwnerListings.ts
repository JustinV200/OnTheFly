/* Loads what the acting business has put up for bids: its expenses that have a listing, then each listing's owner inbox
   (price, cadence, bidding mode, deadline, visibility, offer count). One inbox request per listing is fine at demo scale
   and needs no new backend endpoint. A failed listing is reported on its own card; the rest still show. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, get } from '../../shared/api/client';
import { ApiQueryState, useApiQuery } from '../../shared/api/useApiQuery';
import type { Expense, ExpenseListResponse } from '../dashboard/types';
import type { OwnerListingInbox } from './types';

export type InboxLoad =
  | { phase: 'loading' }
  | { phase: 'loaded'; inbox: OwnerListingInbox }
  | { phase: 'failed'; error: ApiError };

export interface OwnerListing {
  listingId: string;
  // The private expense behind the listing: its vendor and visibility. Owner-only.
  expense: Expense;
  inbox: InboxLoad;
}

interface UseOwnerListingsResult {
  expenses: ApiQueryState<ExpenseListResponse>;
  listings: OwnerListing[];
  // Reload everything, e.g. after an unpublish.
  reload: () => void;
  // Retry one listing's inbox after it failed.
  retryListing: (listingId: string) => void;
}

/** Load the acting business's listings with each one's owner-visible facts. */
export function useOwnerListings(): UseOwnerListingsResult {
  const expenses = useApiQuery<ExpenseListResponse>('/api/expenses');
  const [inboxes, setInboxes] = useState<Record<string, InboxLoad>>({});
  const [reloadCount, setReloadCount] = useState(0);
  // Bumped by every new round of requests, so a response from an earlier round can't overwrite a later one.
  const roundRef = useRef(0);

  // An unpublished listing keeps its listing_id, so it stays here with its retained offers.
  const listed = useMemo(
    () => (expenses.data?.expenses ?? []).filter((expense): expense is Expense & { listing_id: string } => expense.listing_id !== null),
    [expenses.data],
  );
  const idsKey = listed.map((expense) => expense.listing_id).join(',');

  const loadInbox = useCallback(async (listingId: string, round: number): Promise<void> => {
    try {
      const inbox = await get<OwnerListingInbox>(`/api/listings/${listingId}/inbox`);
      if (roundRef.current === round) {
        setInboxes((current) => ({ ...current, [listingId]: { phase: 'loaded', inbox } }));
      }
    } catch (caught) {
      if (roundRef.current === round) {
        setInboxes((current) => ({ ...current, [listingId]: { phase: 'failed', error: toApiError(caught) } }));
      }
    }
  }, []);

  useEffect(() => {
    const round = roundRef.current + 1;
    roundRef.current = round;
    // A reload keeps the last loaded facts on screen until fresh ones arrive, rather than flashing back to loading.
    idsKey.split(',').filter(Boolean).forEach((listingId) => void loadInbox(listingId, round));
  }, [idsKey, reloadCount, loadInbox]);

  const listings = listed.map((expense) => ({
    listingId: expense.listing_id,
    expense,
    inbox: inboxes[expense.listing_id] ?? { phase: 'loading' as const },
  }));

  const reload = (): void => {
    expenses.reload();
    setReloadCount((count) => count + 1);
  };

  const retryListing = (listingId: string): void => {
    setInboxes((current) => ({ ...current, [listingId]: { phase: 'loading' } }));
    void loadInbox(listingId, roundRef.current);
  };

  return { expenses, listings, reload, retryListing };
}

function toApiError(caught: unknown): ApiError {
  if (caught instanceof ApiError) {
    return caught;
  }
  // Anything else is a frontend bug; log it loudly and still show a visible failure on the card.
  console.error('Unexpected error while loading a listing inbox', caught);
  return new ApiError(-1, { error: 'client_error', detail: String(caught) });
}
