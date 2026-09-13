/* Derives the facts a My listings card needs from the expense and, once loaded, the listing's inbox.
   Visibility is read from both: if either says public, the card treats the listing as public, so the owner is never told
   a listing is private while strangers might still see it, and Unpublish stays on the card. */
import type { OwnerListingRecord } from '../types';
import type { OwnerListing } from '../useOwnerListings';

export interface ListingStatus {
  isPublic: boolean;
  // The stored listing record, or null while its inbox is loading or failed.
  record: OwnerListingRecord | null;
  // Active offers, or null until the inbox loads.
  offerCount: number | null;
  // Scope drafted but never published, with nothing received: not "offers retained".
  isDraft: boolean;
}

/** Return the card's status facts. */
export function listingStatus({ expense, inbox }: OwnerListing): ListingStatus {
  const record = inbox.phase === 'loaded' ? inbox.inbox.listing : null;
  const offerCount = inbox.phase === 'loaded' ? inbox.inbox.challenges.length : null;
  const isPublic = expense.visibility === 'public' || record?.visibility === 'public';
  const isDraft = !isPublic && record !== null && record.published_at === null && offerCount === 0;
  return { isPublic, record, offerCount, isDraft };
}
