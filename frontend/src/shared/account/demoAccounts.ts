/* Lists the seeded demo businesses the switcher can act as.
   Must stay in sync with SEEDED_ACCOUNTS in backend/app/db/seed.py. */
export interface DemoAccount {
  id: string;
  handle: string;
  businessName: string;
  initials: string;
  // A distinct colour per business, so the audience can follow who is acting from across the room.
  color: string;
}

// Slate, not a business colour: the visitor must never look like one of the seeded businesses.
export const PUBLIC_VISITOR_COLOR = '#475569';

export const demoAccounts: DemoAccount[] = [
  { id: 'acc_owner_1', handle: 'apex-facilities', businessName: 'Apex Facilities Group', initials: 'AF', color: '#1d4ed8' },
  { id: 'acc_challenger_1', handle: 'bay-clean-pro', businessName: 'Bay Clean Professional Services', initials: 'BC', color: '#047857' },
  { id: 'acc_challenger_2', handle: 'golden-gate-janitorial', businessName: 'Golden Gate Janitorial', initials: 'GG', color: '#b45309' },
  // "SU", not "SB": Sub B Compliance Partners keeps "SB" because it is on stage in the task chain.
  { id: 'acc_challenger_3', handle: 'summit-building-services', businessName: 'Summit Building Services', initials: 'SU', color: '#7c3aed' },
  { id: 'acc_owner_2', handle: 'tidewater-architecture', businessName: 'Tidewater Architecture Studio', initials: 'TA', color: '#0f766e' },
  { id: 'acc_govcon_1', handle: 'govcon-industries', businessName: 'GovCon Industries', initials: 'GI', color: '#be123c' },
  // The task chain's demo bidders (plan2, "Demo"): Prime A wins GovCon's DevSecOps task, Sub B wins the piece Prime A splits off.
  { id: 'acc_prime_a', handle: 'prime-a-federal', businessName: 'Prime A Federal Systems', initials: 'PA', color: '#0369a1' },
  { id: 'acc_sub_b', handle: 'sub-b-compliance', businessName: 'Sub B Compliance Partners', initials: 'SB', color: '#4d7c0f' },
];

// The three businesses of the GovCon task chain, in story order (plan2, "Demo"). The switcher lists them first because
// they are the ones a presenter reaches for; backend app/services/demo/task_chain/accounts.py names the same three.
export const DEMO_CHAIN_ACCOUNT_IDS: readonly string[] = ['acc_govcon_1', 'acc_prime_a', 'acc_sub_b'];
