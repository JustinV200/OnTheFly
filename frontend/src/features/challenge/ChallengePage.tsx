/* Hosts the challenge form for one public listing and every way submitting can go wrong.
   The mode shown when the form opened is what the challenger acknowledges; a later change must be re-confirmed. */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { ApiError } from '../../shared/api/client';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { describeDeadline } from '../../shared/format/describeDeadline';
import type { MarketplaceListing } from '../marketplace/types';
import { ChallengeForm } from './ChallengeForm';
import { SubmittedOffer } from './SubmittedOffer';
import type { BiddingModeValue, ChallengePayload, ChallengeResponse } from './types';
import { useChallenge } from './useChallenge';

// Polling lets the page notice an unpublish or a mode change while the challenger is still typing.
const POLL_INTERVAL_MS = 5000;

/** Render the challenge page for the acting business. */
export function ChallengePage(): JSX.Element {
  const { id = '' } = useParams();
  const { account } = useActingAccount();
  const listingQuery = useApiQuery<MarketplaceListing>(`/api/marketplace/${id}`, { pollIntervalMs: POLL_INTERVAL_MS });
  const submitChallenge = useChallenge();
  const [shownMode, setShownMode] = useState<BiddingModeValue | null>(null);
  const [submitted, setSubmitted] = useState<ChallengeResponse | null>(null);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMode: BiddingModeValue | null = listingQuery.data ? (listingQuery.data.listing.bidding_mode === 'open' ? 'open' : 'sealed') : null;
  // The first mode the challenger saw becomes the acknowledged one; later changes don't silently replace it.
  useEffect(() => {
    if (shownMode === null && currentMode !== null) {
      setShownMode(currentMode);
    }
  }, [currentMode, shownMode]);

  if (!account) {
    return (
      <EmptyState action={<Link to={`/listings/${id}`}>View the listing</Link>} title="Pick a business to challenge as">
        Offers come from a business on the platform. Choose one in the bar above. Visitors can still view the listing.
      </EmptyState>
    );
  }
  if (listingQuery.error?.status === 404) {
    return (
      <EmptyState action={<Link to="/marketplace">Back to the marketplace</Link>} title="This listing is no longer public">
        Its owner unpublished it{submitted ? ' after your offer was recorded. Your offer is kept with the owner' : '. Nothing you typed here was submitted'}.
      </EmptyState>
    );
  }
  if (!listingQuery.data || !currentMode || !shownMode) {
    return listingQuery.error
      ? <ErrorState error={listingQuery.error} onRetry={listingQuery.reload} title="Couldn’t load this listing" />
      : <LoadingSpinner label="Loading listing terms…" />;
  }

  const { listing } = listingQuery.data;
  const deadline = describeDeadline(listing.challenge_deadline);

  const handleSubmit = async (payload: ChallengePayload): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      setSubmitted(await submitChallenge(id, payload));
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setSubmitError(error);
      // Re-read the listing so a mode change or unpublish that caused the rejection shows immediately.
      listingQuery.reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Challenge: {categoryLabel(listing.category)}, {listing.service_area_approximate}</h2>
      <p style={{ fontSize: '1.2rem', margin: '0 0 0.25rem' }}>
        They currently pay <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} /> / {listing.billing_cadence}
      </p>
      <p style={{ color: deadline.isClosed ? '#991b1b' : '#475569', marginTop: 0 }}>{deadline.text}</p>

      {shownMode !== currentMode ? (
        <section role="alert" style={{ backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '12px', margin: '1rem 0', padding: '1rem' }}>
          <strong>The owner changed bidding from {shownMode} to {currentMode} while you were writing.</strong>
          <p style={{ margin: '0.5rem 0' }}>
            {currentMode === 'open'
              ? 'An offer submitted now would show its price and scope to other challengers (never your identity).'
              : 'An offer submitted now would be sealed: only the owner would see its price.'}{' '}
            Nothing has been submitted.
          </p>
          <button onClick={() => setShownMode(currentMode)} type="button">I’ve read the new terms: continue with {currentMode} bidding</button>
        </section>
      ) : null}

      {submitError ? (
        <ErrorState error={submitError} title={submitError.status === 409 ? 'Not submitted: the bidding terms changed' : 'Your offer was not submitted'} />
      ) : null}

      {submitted ? <SubmittedOffer offer={submitted} onReviseAgain={() => setSubmitted(null)} /> : null}
      {!submitted && deadline.isClosed ? (
        <EmptyState title="Closed to new offers">The deadline has passed, so offers and revisions are no longer accepted.</EmptyState>
      ) : null}
      {!submitted && !deadline.isClosed && shownMode === currentMode ? (
        <ChallengeForm acknowledgedMode={shownMode} isSubmitting={isSubmitting} onSubmit={handleSubmit} scopeSummary={listing.scope_summary} />
      ) : null}
    </section>
  );
}
