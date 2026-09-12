/* Hosts the challenge form for a selected public listing.
   Submission wiring lives here while the form remains focused on input capture. */
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ChallengeForm } from './ChallengeForm';
import type { ChallengeResponse } from './types';
import { useChallenge } from './useChallenge';

/** Render the challenge page and show the latest submission result. */
export function ChallengePage(): JSX.Element {
  const { id = '' } = useParams();
  const submitChallenge = useChallenge();
  const [submitted, setSubmitted] = useState<ChallengeResponse | null>(null);

  return (
    <section>
      <h2>Submit challenge</h2>
      <ChallengeForm onSubmit={async (payload) => setSubmitted(await submitChallenge(id, payload))} />
      {submitted ? <p>Submitted {submitted.provenance} challenge at {submitted.price_minor} minor units.</p> : null}
    </section>
  );
}
