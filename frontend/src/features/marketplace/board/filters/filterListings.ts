/* Narrows the market board to one category and a search text. Client-side over the feed already loaded, so the
   category chips can count the whole feed. Matching reads public projection fields only and never looks at a price. */
import { categoryLabel } from '../../../../shared/format/categoryLabel';
import type { MarketplaceListing } from '../../types';

/** True when a listing belongs to the chosen category ('' matches all). Compared by label, so stored aliases match. */
export function matchesCategory(item: MarketplaceListing, category: string): boolean {
  return category === '' || categoryLabel(item.listing.category) === categoryLabel(category);
}

/** Return listings in the category whose title, category label, service area or scope summary contains the search text.
    Older listings have no title; they are still found by their category, which is what their card is titled by. */
export function filterListings(listings: MarketplaceListing[], category: string, searchText: string): MarketplaceListing[] {
  const needle = searchText.trim().toLowerCase();
  return listings.filter((item) => {
    if (!matchesCategory(item, category)) {
      return false;
    }
    if (needle === '') {
      return true;
    }
    const { listing } = item;
    return [listing.title, categoryLabel(listing.category), listing.service_area_approximate, listing.scope_summary].some((field) =>
      (field ?? '').toLowerCase().includes(needle),
    );
  });
}
