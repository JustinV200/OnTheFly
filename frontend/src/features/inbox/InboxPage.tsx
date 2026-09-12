/* Loads and renders the owner challenge inbox for one listing.
   It shows scope deltas before potential savings to keep comparisons honest. */
import { useParams } from 'react-router-dom';

import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ChallengeRow } from './ChallengeRow';
import { ComparisonView } from './ComparisonView';
import { useInbox } from './useInbox';

/** Render the owner inbox page for one published listing. */
export function InboxPage(): JSX.Element {
  const { id = '' } = useParams();
  const { inbox, comparison } = useInbox(id);

  if (!inbox || !comparison) {
    return <LoadingSpinner />;
  }

  return (
    <section>
      <h2>Challenge inbox</h2>
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
