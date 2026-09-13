/* The persistent layout: the top bar (brand, navigation, search, demo-data chip, theme, acting business), then the page.
   The page subtree is keyed by acting account, so switching business remounts it and refetches as that business. */
import { Outlet } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { TopBar } from './topbar/TopBar';
import './AppShell.css';

/** Render the app chrome around the current route. */
export function AppShell(): JSX.Element {
  const { account } = useActingAccount();

  return (
    <div className="app-shell">
      {/* First in tab order, so keyboard users can skip the bar on every page. */}
      <a className="app-shell__skip-link" href="#main-content">Skip to page content</a>
      <TopBar />
      {/* tabIndex -1 lets the skip link move focus here without adding a tab stop. */}
      <main className="app-shell__container app-shell__main" id="main-content" tabIndex={-1}>
        {/* Without the key, a page fetched as the previous business would keep showing its data. */}
        <ErrorBoundary key={account?.id ?? 'public-visitor'}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
