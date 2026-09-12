/* The owner's offers inbox for one listing: controls, any genuine offer first, every offer, then the comparison.
   It polls, so an offer made by another business shows up after switching back without a refresh. */
import { Link, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { ChallengeRow } from './ChallengeRow';
import { ComparisonView } from './ComparisonView';
import { ListingControls } from './controls/ListingControls';
import { GenuineOfferCallout } from './offers/GenuineOfferCallout';
import type { OwnerChallengeListResponse } from './types';
import { useInbox } from './useInbox';

/** Render the owner inbox page for one listing. */
export function InboxPage(): JSX.Element {
  const { id = '' } = useParams();
  const { account } = useActingAccount();
  const { inbox, comparison, reload } = useInbox(id);
  const ownerOffers = useApiQuery<OwnerChallengeListResponse>(`/api/listings/${id}/challenges`, { pollIntervalMs: 5000 });

  if (inbox.error?.status === 404 || inbox.error?.status === 401) {
    // Same message whether the listing is missing or belongs to someone else, so ids can't be probed.
    return (
      <EmptyState action={<Link to="/marketplace">Back to the marketplace</Link>} title="Only this listing’s owner can see its offers">
        {account ? `You're acting as ${account.businessName}, which doesn't own this listing.` : 'Pick the owning business in the bar above.'}{' '}
        Other challengers never see who made an offer.
      </EmptyState>
    );
  }
  if (!inbox.data) {
    return inbox.error
      ? <ErrorState error={inbox.error} onRetry={reload} title="Couldn’t load offers" />
      : <LoadingSpinner label="Loading offers…" />;
  }

  const { listing, challenges } = inbox.data;
  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Offers on your {categoryLabel(listing.category).toLowerCase()} listing</h2>
      <p style={{ margin: 0 }}>
        You pay <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} /> / {listing.billing_cadence} ·{' '}
        {listing.scope_summary}
      </p>
      {listing.visibility !== 'public' ? (
        <p role="status" style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
          🔒 This listing is private now. Nobody else can see it. The offers below arrived while it was public and are kept for you.
        </p>
      ) : null}

      <ListingControls listing={listing} onChanged={reload} />
      <GenuineOfferCallout offers={ownerOffers} />
      {inbox.error ? <ErrorState error={inbox.error} onRetry={reload} title="Showing the last loaded offers; a refresh failed" /> : null}

      {challenges.length === 0 ? (
        <EmptyState action={<Link to={`/listings/${listing.id}`}>See the listing as challengers do</Link>} title="No offers yet">
          {listing.visibility === 'public'
            ? 'Your listing is live, and the public sees "no offers yet". New offers appear here automatically. Most listings start this way.'
            : 'No offers arrived while this listing was public.'}
        </EmptyState>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '900px', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>Challenger (visible only to you)</th>
                <th>Scope differences</th>
                <th>Price</th>
                <th>Potential savings</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((challenge) => <ChallengeRow challenge={challenge} key={challenge.challenge_id} />)}
            </tbody>
          </table>
        </div>
      )}

      {challenges.length > 0 && comparison.data ? <ComparisonView rows={comparison.data.rows} /> : null}
      {challenges.length > 0 && !comparison.data && comparison.error ? (
        <ErrorState error={comparison.error} onRetry={reload} title="Couldn’t load the comparison" />
      ) : null}
      <p style={{ color: '#475569', marginTop: '1rem' }}>Savings are potential until you actually switch providers.</p>
    </section>
  );
}
