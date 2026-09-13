/* Names where connection data comes from in dashboard copy, e.g. "fixture" or "Stripe sandbox".
   It names origin only and never implies the data was checked. */

// Display names for the providers the backend reports. An unknown provider shows its raw id rather than a guess.
const PROVIDER_NAMES: Record<string, string> = { fixture: 'fixture', stripe: 'Stripe' };

/** Return a provider's display name followed by its provenance, dropping the provenance when it repeats the name. */
export function sourceLabel(provider: string, provenance: string): string {
  const name = PROVIDER_NAMES[provider] ?? provider;
  return name.toLowerCase() === provenance ? name : `${name} ${provenance}`;
}
