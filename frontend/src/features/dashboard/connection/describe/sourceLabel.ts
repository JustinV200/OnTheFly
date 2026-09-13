/* Names where connection data comes from in Spend copy, e.g. "Hackathon demo ledger" or "Stripe sandbox".
   It names origin only and never implies the data was checked. The provenance label itself is always shown beside these
   names as a ProvenanceBadge, so a synthetic ledger is never mistaken for Stripe data. */

interface ProviderName {
  name: string;
  // The provenance this provider normally carries; it is left out of the name only when it matches.
  usualProvenance: string | null;
}

// "fixture account fixture_apex_main" was implementation jargon (roadmap 11, step 9); owners see the ledger's plain name.
// An unknown provider shows its raw id rather than a guess.
const PROVIDERS: Record<string, ProviderName> = {
  fixture: { name: 'Hackathon demo ledger', usualProvenance: 'fixture' },
  stripe: { name: 'Stripe', usualProvenance: null },
};

/** Return a provider's display name, followed by its provenance unless that is the provider's usual one or repeats the name. */
export function sourceLabel(provider: string, provenance: string): string {
  const known = PROVIDERS[provider];
  const name = known?.name ?? provider;
  if (provenance === known?.usualProvenance || name.toLowerCase() === provenance) {
    return name;
  }
  return `${name} ${provenance}`;
}
