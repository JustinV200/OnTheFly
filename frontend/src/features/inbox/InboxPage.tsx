/* Loads and renders the owner challenge inbox for one listing.
   It shows scope deltas before potential savings to keep comparisons honest. */
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { post } from '../../shared/api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ChallengeRow } from './ChallengeRow';
import { ComparisonView } from './ComparisonView';
import { useInbox } from './useInbox';

/** Render the owner inbox page for one published listing. */
export function InboxPage(): JSX.Element {
  const { id = '' } = useParams();
  const { inbox, comparison } = useInbox(id);
  const [biddingMode, setBiddingMode] = useState<string | null>(null);
  const [modeMessage, setModeMessage] = useState<string | null>(null);

  // Show the current mode from inbox when it loads.
  const currentMode = biddingMode ?? inbox?.bidding_mode ?? 'sealed';

  const toggleBiddingMode = async (): Promise<void> => {
    const nextMode = currentMode === 'open' ? 'sealed' : 'open';
    try {
      await post(`/api/listings/${id}/bidding-mode`, { mode: nextMode });
      setBiddingMode(nextMode);
      // A mode change is never retroactive — already-submitted sealed offers stay sealed.
      setModeMessage(
        nextMode === 'open'
          ? 'Bidding is now open. Only offers submitted from this point forward will be public to other challengers. Sealed offers already received remain sealed.'
          : 'Bidding is now sealed. All future offers will be private.',
      );
    } catch {
      setModeMessage('Failed to update bidding mode.');
    }
  };

  if (!inbox || !comparison) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <h2>Challenge inbox</h2>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <span>
          Bidding mode: <strong>{currentMode}</strong>
        </span>
        <button onClick={() => void toggleBiddingMode()} type="button">
          Switch to {currentMode === 'open' ? 'sealed' : 'open'}
        </button>
      </div>
      {modeMessage ? <p style={{ padding: '0.5rem', background: '#f0f0f0' }}>{modeMessage}</p> : null}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th align="left">Challenger</th>
            <th align="left">Scope deltas</th>
            <th align="left">Normalized monthly</th>
            <th align="left">Scope completeness</th>
            <th align="left">Potential savings</th>
            <th align="left">Evidence</th>
            <th align="left">Provenance</th>
          </tr>
        </thead>
        <tbody>
          {inbox.challenges.map((challenge) => <ChallengeRow key={challenge.challenge_id} challenge={challenge} />)}
        </tbody>
      </table>
      <ComparisonView rows={comparison.rows} />
    </section>
  );
}
