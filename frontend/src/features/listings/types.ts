/* Declares the owner-visible listing facts My listings reads from GET /api/listings/{id}/inbox (backend api/inbox).
   Only the fields this page shows are declared; offer rows are read for their count alone, never their contents. */

/** The stored listing record the inbox returns; visibility reads "private" once unpublished, while offers are kept. */
export interface OwnerListingRecord {
  id: string;
  // The task's title for a listing scoped as requirement rows; null or absent for an older listing without one.
  title?: string | null;
  category: string;
  service_area_approximate: string;
  price_minor: number;
  price_currency: string;
  billing_cadence: string;
  bidding_mode: string;
  challenge_deadline: string | null;
  visibility: string;
  published_at: string | null;
}

export interface OwnerListingInbox {
  // Active offers on the listing; My listings only counts them.
  challenges: Array<{ challenge_id: string }>;
  bidding_mode: string;
  listing: OwnerListingRecord;
  // The task behind the listing, read for its id alone (backend api/inbox InboxTaskSummary); absent on older payloads.
  task?: { id: string } | null;
}
