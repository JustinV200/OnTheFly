/* The persistent layout: the top bar (brand, navigation, search, demo-data chip, theme, acting business), the presenter's
   demo steps rail, then the page. The page subtree is keyed by acting account, so switching business remounts it and
   refetches as that business. A ?as= link in the URL picks the acting business (useAccountLink). */
import { Outlet } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { FlyBrainDock } from '../../features/brainview';
import { DemoRail } from '../../features/demo';
import { useAccountLink } from '../account/useAccountLink';
import { TopBar } from './topbar/TopBar';
import './AppShell.css';

/** Render the app chrome around the current route. */
export function AppShell(): JSX.Element {
  const { account } = useActingAccount();
  useAccountLink();

  return (
    <div className="app-shell">
      {/* First in tab order, so keyboard users can skip the bar on every page. */}
      <a className="app-shell__skip-link" href="#main-content">Skip to page content</a>
      <TopBar />
      {/* Outside the page subtree, like the top bar: "Do it" switches business, which remounts the page but not the rail.
          It decides for itself where it shows (never on the demo guide or the public opt-out page). */}
      <DemoRail />
      {/* tabIndex -1 lets the skip link move focus here without adding a tab stop. */}
      <main className="app-shell__container app-shell__main" id="main-content" tabIndex={-1}>
        {/* Without the key, a page fetched as the previous business would keep showing its data. */}
        <ErrorBoundary key={account?.id ?? 'public-visitor'}>
          <Outlet />
        </ErrorBoundary>
      </main>
      {/* Outside the page subtree, so a fly brain run keeps playing across navigation. Renders nothing until one starts. */}
      <FlyBrainDock />
    </div>
  );
}
