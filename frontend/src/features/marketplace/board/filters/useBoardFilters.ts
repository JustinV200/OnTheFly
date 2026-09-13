/* Keeps the market board's search text, category and sort in the URL (?q=&category=&sort=), so the top bar's search
   can open a filtered board and the back button returns to the same view. It filters nothing itself. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { BoardSort, parseBoardSort } from './sortListings';

export interface BoardFilters {
  // What the search box shows right now; it can run ahead of the URL while a navigation is pending.
  searchText: string;
  setSearchText: (text: string) => void;
  // A raw category key from the feed, or '' for every category.
  category: string;
  setCategory: (category: string) => void;
  sort: BoardSort;
  setSort: (sort: BoardSort) => void;
  // True when search or category narrows the board; sort alone never hides a listing.
  isFiltered: boolean;
  clearFilters: () => void;
}

/** Read and write the board's filters through the URL search params. */
export function useBoardFilters(): BoardFilters {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = parseBoardSort(params.get('sort'));

  const [searchText, setSearchTextState] = useState(urlQuery);
  // The last q this page wrote. A URL q that differs came from elsewhere (the top bar, back button) and replaces the
  // box's text; one that matches is our own write arriving, which must not overwrite keystrokes typed since.
  const lastWrittenQueryRef = useRef(urlQuery);
  useEffect(() => {
    if (urlQuery !== lastWrittenQueryRef.current) {
      lastWrittenQueryRef.current = urlQuery;
      setSearchTextState(urlQuery);
    }
  }, [urlQuery]);

  const writeParams = useCallback(
    (patch: Record<string, string>): void => {
      // replace, not push: each keystroke or chip press would otherwise become its own history entry.
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setSearchText = useCallback(
    (text: string): void => {
      setSearchTextState(text);
      lastWrittenQueryRef.current = text;
      writeParams({ q: text });
    },
    [writeParams],
  );

  return {
    searchText,
    setSearchText,
    category,
    setCategory: (nextCategory) => writeParams({ category: nextCategory }),
    sort,
    // The default sort stays out of the URL, so a plain /marketplace link and the default view are the same address.
    setSort: (nextSort) => writeParams({ sort: nextSort === 'offers' ? '' : nextSort }),
    isFiltered: searchText.trim() !== '' || category !== '',
    clearFilters: () => {
      setSearchTextState('');
      lastWrittenQueryRef.current = '';
      writeParams({ q: '', category: '' });
    },
  };
}
