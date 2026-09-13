/* The sticky top bar, laid out like a market app's header: identity and navigation on the left, then search (on very
   wide screens; the markets page has its own), the demo-data chip, a light/dark flip, and the acting business.
   The chip and the business name are never truncated: one is an honesty label, the other must read on a projector.
   On phones the chip takes its own row and the navigation drops to a scrolling tab row. A rule in the acting business's
   colour runs along the top edge, so a switch is visible across the room; AccountMenu says the same thing in words. */
import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { PUBLIC_VISITOR_COLOR } from '../../../shared/account/demoAccounts';
import { ThemeQuickToggle } from '../../../shared/theme';
import { AccountMenu } from '../../account/menu/AccountMenu';
import { DemoDataChip } from '../seams/DemoDataChip';
import { BrandMark } from './BrandMark';
import { MarketSearch } from './MarketSearch';
import { NavBar } from './NavBar';
import './TopBar.css';

/** Render the top bar with brand, navigation, search, data labels, theme, and the identity menu. */
export function TopBar(): JSX.Element {
  const { account } = useActingAccount();
  const { pathname } = useLocation();
  const style = { '--acting-color': account?.color ?? PUBLIC_VISITOR_COLOR } as CSSProperties;
  // The markets page has its own search box; a second one in the bar would offer the same search twice.
  const showsSearch = pathname !== '/marketplace';

  return (
    <header className="top-bar" style={style}>
      <div className="top-bar__inner">
        <Link aria-label="On the Fly, home" className="top-bar__brand" to="/marketplace">
          <BrandMark />
          <span className="top-bar__wordmark">On the Fly</span>
        </Link>
        <NavBar placement="inline" />
        {/* The wrapper stays even without the field: it is the flexible gap that keeps the chip and account at the end. */}
        <div className="top-bar__search">
          {showsSearch ? <MarketSearch /> : null}
        </div>
        <div className="top-bar__chip">
          {/* Keyed by account: a switch mid-demo is exactly when an offer has just landed, so refetch the counts then. */}
          <DemoDataChip key={account?.id ?? 'public-visitor'} />
        </div>
        <ThemeQuickToggle className="top-bar__theme" />
        <div className="top-bar__account">
          <AccountMenu />
        </div>
      </div>
      <NavBar placement="row" />
    </header>
  );
}
