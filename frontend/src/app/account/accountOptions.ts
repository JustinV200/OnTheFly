/* The choices every account switcher offers: the three task-chain businesses first (the ones a presenter reaches for),
   then the other seeded businesses, then the public visitor on its own.
   One list, so the desktop band and the phone menu can never offer different sets. */
import { DEMO_CHAIN_ACCOUNT_IDS, DemoAccount, demoAccounts } from '../../shared/account/demoAccounts';

export interface AccountOption {
  // null is the signed-out public visitor.
  id: string | null;
  label: string;
  account: DemoAccount | null;
}

export interface AccountOptionGroup {
  heading: string;
  options: AccountOption[];
}

function toOption(account: DemoAccount): AccountOption {
  return { id: account.id, label: account.businessName, account };
}

// Chain businesses follow story order (GovCon, Prime A, Sub B), not seed order.
const chainAccounts = DEMO_CHAIN_ACCOUNT_IDS.flatMap((id) => demoAccounts.filter((account) => account.id === id));

export const accountGroups: AccountOptionGroup[] = [
  { heading: 'Demo chain', options: chainAccounts.map(toOption) },
  { heading: 'Other demo businesses', options: demoAccounts.filter((account) => !DEMO_CHAIN_ACCOUNT_IDS.includes(account.id)).map(toOption) },
];

// Kept apart from the groups: it is the logged-out view, not another business.
export const publicVisitorOption: AccountOption = { id: null, label: 'Public visitor', account: null };
