/* Lists an account's live financial links for dashboard copy, e.g. "fixture account fixture_apex_main and Stripe sandbox account". */
import type { LinkedConnection } from '../types';
import { sourceLabel } from './sourceLabel';

/** Describe each live link by its source, adding the provider account id only when the backend shares one. */
export function describeConnections(connections: LinkedConnection[]): string {
  return connections
    .map((link) => {
      const origin = sourceLabel(link.provider, link.provenance);
      return link.provider_account_id ? `${origin} account ${link.provider_account_id}` : `${origin} account`;
    })
    .join(' and ');
}
