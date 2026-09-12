/* Collects a challenger's counteroffer details before submission.
   The form shows bidding context plainly before the challenger enters price. */
import { FormEvent, useState } from 'react';

import type { ChallengePayload } from './types';

interface ChallengeFormProps {
  onSubmit: (payload: ChallengePayload) => Promise<void>;
}

/** Render the challenge form for a public listing. */
export function ChallengeForm({ onSubmit }: ChallengeFormProps): JSX.Element {
  const [priceMinor, setPriceMinor] = useState<string>('187500');
  const [scopeIncluded, setScopeIncluded] = useState<string>('Full cleaning scope');
  const [scopeExcluded, setScopeExcluded] = useState<string>('');
  const [messageToOwner, setMessageToOwner] = useState<string>('Happy to visit the site this week.');

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
      <p><strong>Bidding mode is shown before you submit:</strong> sealed by default unless the listing says open.</p>
      <label>Monthly price (minor units)<input value={priceMinor} onChange={(event) => setPriceMinor(event.target.value)} /></label>
      <label>Scope included<input value={scopeIncluded} onChange={(event) => setScopeIncluded(event.target.value)} /></label>
      <label>Scope excluded<input value={scopeExcluded} onChange={(event) => setScopeExcluded(event.target.value)} /></label>
      <label>Message to owner<input value={messageToOwner} onChange={(event) => setMessageToOwner(event.target.value)} /></label>
      <button type="submit">Submit challenge</button>
    </form>
  );
}
