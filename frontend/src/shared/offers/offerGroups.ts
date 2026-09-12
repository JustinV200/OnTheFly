/* Tells an offers table where each group the server ranks apart begins, so every group gets a heading.
   The server already orders rows (backend comparison/ordering.py); this only reads that order, never re-sorts. */

// The groups that need a heading. Offers on the current scope come first and need none.
export type HeadedOfferGroup = 'earlier' | 'unranked';

// The two fields every ranked offer row carries, on the owner's inbox and on the public leaderboard alike.
interface GroupableOffer {
  is_current_scope_version: boolean;
  unranked_reason: string | null;
}

/** Return the group heading to render before rows[index], or null when that row continues the previous group. */
export function groupHeadingBefore(rows: GroupableOffer[], index: number): HeadedOfferGroup | null {
  const group = offerGroup(rows[index]);
  const previousGroup = index > 0 ? offerGroup(rows[index - 1]) : 'current';
  return group === previousGroup || group === 'current' ? null : group;
}

function offerGroup(row: GroupableOffer): HeadedOfferGroup | 'current' {
  // Mirrors offer_sort_key: an unranked row sits in the last group whichever version it answered.
  if (row.unranked_reason !== null) {
    return 'unranked';
  }
  return row.is_current_scope_version ? 'current' : 'earlier';
}
