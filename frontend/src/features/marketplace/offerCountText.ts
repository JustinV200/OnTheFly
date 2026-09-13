/* Words for how many offers a public listing has received, shared by the feed card, listing detail, and similar listings.
   The count is public in both bidding modes; only prices depend on the mode. */

/** Return "No offers yet", "1 offer so far", or "N offers so far" for a non-negative count. */
export function offerCountText(count: number): string {
  if (count === 0) {
    return 'No offers yet';
  }
  return count === 1 ? '1 offer so far' : `${count} offers so far`;
}
