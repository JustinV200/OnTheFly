/* The persistent layout: acting business, navigation, demo seams, then the routed page.
   The page subtree is keyed by acting account, so switching business remounts it and refetches as that business. */
import { Outlet } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { AccountSwitcher } from '../AccountSwitcher';
import { DemoSeamsBanner } from './DemoSeamsBanner';
import { NavBar } from './NavBar';

/** Render the app chrome around the current route. */
export function AppShell(): JSX.Element {
  const { account } = useActingAccount();

  return (
    <div
      style={{
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: '16px',
        margin: '0 auto',
        maxWidth: '1100px',
        padding: '1rem',
      }}
    >
      <header>
        <AccountSwitcher />
        <NavBar />
        {/* Keyed too: the switch mid-demo is exactly when an offer has just landed, so refetch the counts then. */}
        <DemoSeamsBanner key={account?.id ?? 'public-visitor'} />
      </header>
      <main style={{ marginTop: '1.25rem' }}>
        {/* Without the key, a page fetched as the previous business would keep showing its data. */}
        <ErrorBoundary key={account?.id ?? 'public-visitor'}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
