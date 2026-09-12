/* Renders the anonymized public leaderboard, ranked by scope completeness before price.
   Sealed-at-submission offers are counted but never priced, even after the owner opens bidding. */
import { useApiQuery } from '../../../shared/api/useApiQuery';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import type { LeaderboardResponse } from '../types';
import { ScopeCompleteness } from './ScopeCompleteness';

// Fast enough that an underbid shows up while the audience is still watching.
const POLL_INTERVAL_MS = 4000;

/** Render the leaderboard for one public listing, polling for new offers. */
export function Leaderboard({ listingId }: { listingId: string }): JSX.Element {
  const board = useApiQuery<LeaderboardResponse>(`/api/listings/${listingId}/leaderboard`, { pollIntervalMs: POLL_INTERVAL_MS });

  if (!board.data) {
    return board.error
      ? <ErrorState error={board.error} onRetry={board.reload} title="Leaderboard unavailable" />
      : <LoadingSpinner label="Loading offers…" />;
  }

  const { entries, sealed_offer_count: sealedCount, total_offer_count: totalCount } = board.data;
  const sealedNote = sealedCount > 0
    ? `${sealedCount} ${sealedCount === 1 ? 'offer was' : 'offers were'} made while bidding was sealed and ${sealedCount === 1 ? 'stays' : 'stay'} sealed: counted, never priced here.`
    : null;

  if (board.data.bidding_mode !== 'open') {
    return (
      <section style={boxStyle}>
        <h3 style={{ margin: '0 0 0.25rem' }}>Offers: {totalCount}</h3>
        <p style={{ margin: 0 }}>Sealed bidding: only the count is public. Every price stays with the listing owner.</p>
      </section>
    );
  }

  return (
    <section style={boxStyle}>
      <h3 style={{ margin: '0 0 0.25rem' }}>Open bidding leaderboard</h3>
      <p style={{ color: '#475569', margin: '0 0 0.5rem' }}>
        Ranked by how much of the requested scope an offer covers, then by monthly price, so a cheaper offer that quietly does
        less doesn’t rank first. Bidders are anonymous to each other.
      </p>
      {entries.length === 0 ? <p style={{ margin: 0 }}><strong>No published prices yet.</strong> The first open offer sets the price to beat.</p> : null}
      {entries.length === 1 ? <p style={{ margin: '0 0 0.5rem' }}>One published offer so far: nothing to rank it against yet.</p> : null}
      {entries.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>Rank</th>
                <th>Monthly price</th>
                <th>Scope covered</th>
                <th>Submitted</th>
                <th>Origin</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.challenge_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ fontWeight: 700, padding: '0.4rem 0' }}>#{index + 1}</td>
                  <td style={{ fontSize: '1.1rem' }}><MoneyDisplay amountMinor={entry.normalized_price_minor} currency={entry.price_currency} /></td>
                  <td><ScopeCompleteness score={entry.scope_completeness} /></td>
                  <td>{formatTimestamp(entry.submitted_at)}</td>
                  <td><ProvenanceBadge kind="offer" value={entry.provenance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {sealedNote ? <p style={{ color: '#475569', margin: '0.5rem 0 0' }}>{sealedNote}</p> : null}
    </section>
  );
}

const boxStyle = { border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '1rem', padding: '1rem' };
