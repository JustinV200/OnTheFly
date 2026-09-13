/* The name one imported source carries in Spend's Data sources summary line. GovCon's ledger always reads "Hackathon demo
   ledger — synthetic buyer spend based on public procurement categories" (CLAUDE.md, "Data and workflow boundaries"). That
   wording is true only of GovCon's ledger (backend services/transactions/fixture/GOVCON.md), so another demo ledger, such
   as the commercial-cleaning scenario's, says only that it is synthetic buyer spend; Stripe keeps sourceLabel's name. */
import type { ImportedSource, LinkedConnection } from '../types';
import { sourceLabel } from './sourceLabel';

// The ledger account the GovCon seed imports into (backend cli/seed_govcon_demo.py, PROVIDER_ACCOUNT_ID).
const GOVCON_LEDGER_ACCOUNT_ID = 'fixture_govcon_main';

/** Return the source's display name; a fixture ledger's name always says the spend is synthetic. */
export function sourceDisplayName(source: ImportedSource, connections: LinkedConnection[]): string {
  const name = sourceLabel(source.provider, source.source_type);
  if (source.provider !== 'fixture' || source.source_type !== 'fixture') {
    return name;
  }
  const isGovConLedger = connections.some((link) => link.provider === 'fixture' && link.provider_account_id === GOVCON_LEDGER_ACCOUNT_ID);
  return isGovConLedger
    ? `${name} — synthetic buyer spend based on public procurement categories`
    : `${name} — synthetic buyer spend`;
}
