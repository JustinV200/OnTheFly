/* The sticky top bar: product identity, primary navigation, and the acting business.
   A rule in the acting business's colour runs along its top edge, so a switch is visible across the room;
   the name in AccountMenu says the same thing in words. */
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { AccountMenu } from '../../account/AccountMenu';
import { PUBLIC_VISITOR_COLOR } from '../../account/accountOptions';
import { BrandMark } from './BrandMark';
import { NavBar } from './NavBar';
import './TopBar.css';

/** Render the top bar with brand, navigation, and the identity menu. */
export function TopBar(): JSX.Element {
  const { account } = useActingAccount();
  const style = { '--acting-color': account?.color ?? PUBLIC_VISITOR_COLOR } as CSSProperties;

  return (
    <header className="top-bar" style={style}>
      <div className="top-bar__inner">
        <Link className="top-bar__brand" to="/">
          <BrandMark />
          <span className="top-bar__wordmark">On the Fly</span>
        </Link>
        <NavBar placement="inline" />
        <div className="top-bar__identity">
          <AccountMenu />
        </div>
      </div>
      <NavBar placement="row" />
    </header>
  );
}
