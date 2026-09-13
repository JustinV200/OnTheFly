/* The ?as=<account_id> link format: a URL that opens a tab acting as a named demo business ("public" opens it as the
   public visitor), so a presenter can tile three windows from three links. This module only reads and builds the
   parameter; the provider applies it on load and app/account strips it from the address bar.
   Demo identity only, with no authentication (CLAUDE.md, "No authentication work"). */
import { demoAccounts } from './demoAccounts';

export const ACCOUNT_LINK_PARAM = 'as';

// The one non-id value: a link that deliberately opens the signed-out view.
const PUBLIC_VISITOR_VALUE = 'public';

/** Return the account a search string names: a seeded account id, null for the public visitor, or undefined when the
    parameter is absent or names no seeded account (an unknown value changes nothing, so a typo never signs anyone in). */
export function readAccountLink(search: string): string | null | undefined {
  const value = new URLSearchParams(search).get(ACCOUNT_LINK_PARAM);
  if (value === null) {
    return undefined;
  }
  if (value === PUBLIC_VISITOR_VALUE) {
    return null;
  }
  return demoAccounts.some((account) => account.id === value) ? value : undefined;
}

/** Return path (no query of its own) with the parameter that opens it as accountId, or as the visitor for null. */
export function buildAccountLink(path: string, accountId: string | null): string {
  const params = new URLSearchParams({ [ACCOUNT_LINK_PARAM]: accountId ?? PUBLIC_VISITOR_VALUE });
  return `${path}?${params.toString()}`;
}
