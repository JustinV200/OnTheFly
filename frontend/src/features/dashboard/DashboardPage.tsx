/* Renders the private expenses dashboard route: the acting business's own dashboard, or a defined signed-out state
   for a public visitor instead of a failed request. */
import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { OwnerDashboard } from './OwnerDashboard';
import { SignedOutDashboard } from './SignedOutDashboard';

/** Render the private dashboard for the acting business, or the signed-out state. */
export function DashboardPage(): JSX.Element {
  const { account } = useActingAccount();
  return account ? <OwnerDashboard account={account} /> : <SignedOutDashboard />;
}
