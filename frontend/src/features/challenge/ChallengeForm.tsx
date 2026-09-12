/* Collects a challenger's counteroffer details before submission.
   The form states the actual bidding mode from the listing before the price field. */
import { FormEvent, useState } from 'react';

import type { ChallengePayload } from './types';

interface ChallengeFormProps {
  biddingMode: string;
  onSubmit: (payload: ChallengePayload) => Promise<void>;
}

/** Render the challenge form for a public listing.
 *  biddingMode must come from the listing so challengers see the real state. */
export function ChallengeForm({ biddingMode, onSubmit }: ChallengeFormProps): JSX.Element {
  const [priceMinor, setPriceMinor] = useState<string>('187500');
  const [scopeIncluded, setScopeIncluded] = useState<string>('Full cleaning scope');
  const [scopeExcluded, setScopeExcluded] = useState<string>('');
  const [messageToOwner, setMessageToOwner] = useState<string>('Happy to visit the site this week.');

  // Bidding mode notice shown before the price field — the challenger must see it
  // before entering a price, never after. Open bidding means other challengers
  // will see your price and scope (but never your identity).
  const modeNotice = biddingMode === 'open'
    ? '⚠️ Open bidding — your price and scope will be visible to other challengers. Your identity will not.'
    : '🔒 Sealed bidding — only the listing owner will see your price. Your identity is always private.';

  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSubmit({
          price_minor: Number(priceMinor),
          billing_frequency: 'monthly',
          scope_included: [scopeIncluded],
          scope_excluded: scopeExcluded ? [scopeExcluded] : [],
          scope_extras: [],
          message_to_owner: messageToOwner,
        });
      }}
    >
      <p style={{ padding: '0.75rem', background: '#f7f7f7', borderRadius: '6px' }}>{modeNotice}</p>
      <label>Monthly price (minor units, e.g. 187500 = $1,875)<input value={priceMinor} onChange={(event) => setPriceMinor(event.target.value)} /></label>
      <label>Scope included<input value={scopeIncluded} onChange={(event) => setScopeIncluded(event.target.value)} /></label>
      <label>Scope excluded<input value={scopeExcluded} onChange={(event) => setScopeExcluded(event.target.value)} /></label>
      <label>Message to owner<input value={messageToOwner} onChange={(event) => setMessageToOwner(event.target.value)} /></label>
      <button type="submit">Submit challenge</button>
    </form>
  );
}
