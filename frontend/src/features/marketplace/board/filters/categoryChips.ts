/* Builds the market board's category chips from the categories actually present in the feed, with counts over the
   whole feed (not the search-narrowed list), so a chip's number never changes while typing. */
import { categoryLabel } from '../../../../shared/format/categoryLabel';
import type { FilterChip } from '../../../../shared/ui';
import type { MarketplaceListing } from '../../types';

/** Return "All" plus one chip per category label, busiest first. A selected category missing from the feed keeps a
    zero-count chip, so the pressed filter stays visible and clearable instead of silently vanishing. */
export function buildCategoryChips(listings: MarketplaceListing[], selected: string): FilterChip<string>[] {
  // Keyed by label: stored aliases ("cleaning", "commercial_cleaning") are one category to a reader.
  const groups = new Map<string, { value: string; count: number }>();
  listings.forEach(({ listing }) => {
    const label = categoryLabel(listing.category);
    const group = groups.get(label);
    if (group) {
      group.count += 1;
      // The alphabetically first key names the group, so the chip's URL value doesn't depend on feed order.
      group.value = listing.category < group.value ? listing.category : group.value;
    } else {
      groups.set(label, { value: listing.category, count: 1 });
    }
  });

  const chips = [...groups.entries()]
    .map(([label, group]) => ({ value: group.value, label, count: group.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  // Compared by label, so a selected alias key ("commercial_cleaning") counts as present in its group's chip.
  const hasSelected = selected === '' || groups.has(categoryLabel(selected));
  const selectedChips = hasSelected ? chips : [...chips, { value: selected, label: categoryLabel(selected), count: 0 }];
  return [{ value: '', label: 'All', count: listings.length }, ...selectedChips];
}

/** Map a selected category key onto the chip value that represents its group, so the right chip reads as pressed. */
export function chipValueFor(chips: FilterChip<string>[], selected: string): string {
  if (selected === '') {
    return '';
  }
  const label = categoryLabel(selected);
  return chips.find((chip) => chip.value !== '' && chip.label === label)?.value ?? selected;
}
