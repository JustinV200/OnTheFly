/* Top-level navigation between the private dashboard, the marketplace, and the acting business's public profile. */
import { NavLink } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';

/** Render the primary navigation links for the acting business. */
export function NavBar(): JSX.Element {
  const { account } = useActingAccount();
  const links = [
    { to: '/', label: 'Private dashboard', end: true },
    { to: '/marketplace', label: 'Marketplace', end: false },
    // A visitor has no profile of their own; businesses link to the page strangers see.
    ...(account ? [{ to: `/p/${account.handle}`, label: 'Our public profile', end: false }] : []),
  ];

  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '0.75rem' }}>
      {links.map((link) => (
        <NavLink
          end={link.end}
          key={link.to}
          style={({ isActive }) => ({
            borderBottom: isActive ? '3px solid #0f172a' : '3px solid transparent',
            color: '#0f172a',
            fontWeight: isActive ? 700 : 500,
            paddingBottom: '0.2rem',
            textDecoration: 'none',
          })}
          to={link.to}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
