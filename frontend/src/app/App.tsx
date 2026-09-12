/* Defines the top-level app shell and layout chrome.
   Feature pages are rendered through the shared router outlet. */
import type { ReactElement } from 'react';
import { Outlet, useRoutes } from 'react-router-dom';

import { AccountSwitcher } from './AccountSwitcher';
import { routes } from './routes';

/** Renders the app shell with the account switcher header. */
export function App(): ReactElement | null {
  const element = useRoutes([
    {
      element: <AppShell />,
      children: routes,
    },
  ]);

  return element;
}

/** Renders the persistent layout wrapped around feature routes. */
function AppShell(): JSX.Element {
  return (
    <div style={{ fontFamily: 'sans-serif', margin: '0 auto', maxWidth: '960px', padding: '1rem' }}>
      <header style={{ alignItems: 'center', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Spend Marketplace Demo</h1>
        <AccountSwitcher />
      </header>
      <main style={{ marginTop: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
