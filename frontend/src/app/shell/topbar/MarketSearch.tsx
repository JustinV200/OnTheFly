/* The market search box in the top bar. Submitting opens the marketplace filtered by the query (?q=), which the
   marketplace page reads; searching only ever covers public listings, so it is the same for every business. */
import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Icon } from '../../../shared/ui';
import './MarketSearch.css';

/** Render the search form. */
export function MarketSearch(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');

  // Keep the box in step with the URL, so the marketplace's own filter and the bar never disagree.
  useEffect(() => {
    const current = location.pathname === '/marketplace' ? new URLSearchParams(location.search).get('q') ?? '' : '';
    setQuery(current);
  }, [location.pathname, location.search]);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/marketplace?q=${encodeURIComponent(trimmed)}` : '/marketplace');
  };

  return (
    <form className="market-search" onSubmit={submit} role="search">
      <Icon className="market-search__icon" name="search" size={16} />
      <label className="ui-visually-hidden" htmlFor="market-search-input">Search markets</label>
      <input
        className="market-search__input"
        id="market-search-input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search markets"
        type="search"
        value={query}
      />
    </form>
  );
}
