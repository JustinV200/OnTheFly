/* The choices every account switcher offers: each seeded business, then the public visitor.
   One list, so the desktop band and the phone menu can never offer different sets. */
import { DemoAccount, demoAccounts } from '../../shared/account/demoAccounts';

export interface AccountOption {
  // null is the signed-out public visitor.
  id: string | null;
  label: string;
  account: DemoAccount | null;
}

// Slate, not a business colour: the visitor must never look like one of the seeded businesses.
export const PUBLIC_VISITOR_COLOR = '#475569';

export const accountOptions: AccountOption[] = [
  ...demoAccounts.map((account) => ({ id: account.id, label: account.businessName, account })),
  { id: null, label: 'Public visitor', account: null },
];
