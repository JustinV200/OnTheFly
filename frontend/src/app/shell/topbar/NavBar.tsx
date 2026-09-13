/* Task-based navigation: Markets (open tasks to bid on), Spend (this business's private expenses), and My listings
   (what this business has put up for bids, with offers and invitations). The top bar renders it twice (inline on wide
   screens, as a scrolling tab row on narrow ones); CSS shows exactly one. "My listings" never shows for a public
   visitor, who has none (roadmap 11, "Watch out for"). */
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
    { to: '/marketplace', label: 'Markets', end: false },
    { to: '/', label: 'Spend', end: true },
    ...(account ? [{ to: '/my-listings', label: 'My listings', end: false }] : []),
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
