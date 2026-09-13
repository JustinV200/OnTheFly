/* Renders the private expenses dashboard route: the acting business's own dashboard, or a defined signed-out state
   for a public visitor instead of a failed request. */
import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { OwnerDashboard } from './OwnerDashboard';
import { SignedOutDashboard } from './SignedOutDashboard';

/** Render the private dashboard for the acting business, or the signed-out state. */
export function DashboardPage(): JSX.Element {
  const { account } = useActingAccount();
  // Keyed by account: the dashboard's Stripe hook loads once on mount, so without a remount a switch would keep
  // showing the previous business's connection and imported transactions.
  return account ? <OwnerDashboard account={account} key={account.id} /> : <SignedOutDashboard />;
}
