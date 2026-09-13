/* The market board's controls: a search box, category chips and sort chips, in one band above the grid.
   Presentational only; the filters live in the URL (useBoardFilters) and the page applies them. */
import type { FormEvent } from 'react';

import { FilterChips, FilterChip, Icon, Input } from '../../../shared/ui';
import { chipValueFor } from './filters/categoryChips';
import { BoardSort, SORT_CHIPS } from './filters/sortListings';
import './BoardControls.css';

interface BoardControlsProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  // null while the feed hasn't loaded: there are no categories to offer yet, so no chip rows render.
  categoryChips: FilterChip<string>[] | null;
  category: string;
  onCategoryChange: (category: string) => void;
  sort: BoardSort;
  onSortChange: (sort: BoardSort) => void;
}

/** Render the search field and, once the feed is loaded, the category and sort chip rows. */
export function BoardControls({ searchText, onSearchTextChange, categoryChips, category, onCategoryChange, sort, onSortChange }: BoardControlsProps): JSX.Element {
  // Filtering is live as you type; Enter must not reload the page.
  const preventSubmit = (event: FormEvent<HTMLFormElement>): void => event.preventDefault();

  return (
    <div className="board-controls">
      <form className="board-controls__search" onSubmit={preventSubmit} role="search">
        <Icon className="board-controls__search-icon" name="search" size={16} />
        {/* The icon and placeholder label it visually, matching the top bar's search; the label names it for screen readers. */}
        <label className="ui-visually-hidden" htmlFor="market-board-search">Search markets</label>
        <Input
          className="board-controls__search-input"
          id="market-board-search"
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder="Search markets"
          type="search"
          value={searchText}
        />
      </form>

      {categoryChips ? (
        <div className="board-controls__chips">
          <FilterChips
            chips={categoryChips}
            className="board-controls__categories"
            label="Filter by category"
            onChange={onCategoryChange}
            value={chipValueFor(categoryChips, category)}
          />
          <div className="board-controls__sort">
            <span aria-hidden="true" className="board-controls__sort-label">Sort</span>
            <FilterChips chips={SORT_CHIPS} label="Sort markets" onChange={onSortChange} value={sort} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
