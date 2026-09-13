/* Top-level navigation between the private dashboard, the marketplace, and the acting business's public profile.
   The top bar renders it twice (inline on wide screens, as a scrolling tab row on narrow ones); CSS shows exactly one. */
import { NavLink } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { joinClassNames } from '../../../shared/ui';
import './NavBar.css';

interface NavBarProps {
  // "inline" sits inside the top bar row on wide screens; "row" is its own tab row on narrow screens.
  placement: 'inline' | 'row';
}

/** Render the primary navigation links for the acting business. */
export function NavBar({ placement }: NavBarProps): JSX.Element {
  const { account } = useActingAccount();
  const links = [
    { to: '/', label: 'Private dashboard', end: true },
    { to: '/marketplace', label: 'Marketplace', end: false },
    // A visitor has no profile of their own; businesses link to the page strangers see.
    ...(account ? [{ to: `/p/${account.handle}`, label: 'Our public profile', end: false }] : []),
  ];

  return (
    <nav aria-label="Primary" className={joinClassNames('nav-bar', `nav-bar--${placement}`)}>
      <ul className="nav-bar__list">
        {links.map((link) => (
          <li key={link.to}>
            {/* NavLink sets aria-current="page" on the active link; the CSS styles that, not a colour-only class. */}
            <NavLink className="nav-bar__link" end={link.end} to={link.to}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
