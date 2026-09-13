/* Hosts the challenge form for one public listing and every way submitting can go wrong.
   The mode shown when the form opened is what the challenger acknowledges; a later change must be re-confirmed before
   submitting, and the form stays mounted meanwhile so the draft survives. A returning challenger's form starts from their offer. */
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
import { ExistingOfferNotice } from './ExistingOfferNotice';
import { SubmittedOffer } from './SubmittedOffer';
import type { BiddingModeValue, ChallengePayload, ChallengeResponse, OwnOfferResponse, StoredOffer } from './types';
import { useChallenge } from './useChallenge';

// Polling lets the page notice an unpublish or a mode change while the challenger is still typing.
const POLL_INTERVAL_MS = 5000;

/** Render the challenge page for the acting business. */
export function ChallengePage(): JSX.Element {
  const { id = '' } = useParams();
  const { account } = useActingAccount();
  const listingQuery = useApiQuery<MarketplaceListing>(`/api/marketplace/${id}`, { pollIntervalMs: POLL_INTERVAL_MS });
  // Not polled: AppShell remounts this page when the acting business switches, and after that only this page's
  // own submissions change the offer, which arrive as `submitted`.
  const ownOfferQuery = useApiQuery<OwnOfferResponse>(account ? `/api/listings/${id}/my-offer` : null);
  const submitChallenge = useChallenge();
  const [shownMode, setShownMode] = useState<BiddingModeValue | null>(null);
  const [submitted, setSubmitted] = useState<ChallengeResponse | null>(null);
  const [isConfirmationShown, setIsConfirmationShown] = useState(false);
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
        {submitted
          ? 'Its owner unpublished it after your offer was recorded. Your offer is kept with the owner.'
          : ownOfferQuery.data?.offer
            ? 'Its owner unpublished it. Your existing offer is kept with the owner; nothing you typed here was submitted.'
            : 'Its owner unpublished it. Nothing you typed here was submitted.'}
      </EmptyState>
    );
  }
  if (!listingQuery.data || !currentMode || !shownMode) {
    return listingQuery.error
      ? <ErrorState error={listingQuery.error} onRetry={listingQuery.reload} title="Couldn’t load this listing" />
      : <LoadingSpinner label="Loading listing terms…" />;
  }
  if (!ownOfferQuery.data) {
    // No form until this resolves: a blank form submitted over a stored offer would replace every one of its terms.
    return ownOfferQuery.error
      ? (
        <ErrorState error={ownOfferQuery.error} onRetry={ownOfferQuery.reload} title="Couldn’t check for your existing offer">
          The form stays hidden until this loads, so a blank form can’t replace an offer you already made.
        </ErrorState>
      )
      : <LoadingSpinner label="Checking for your existing offer…" />;
  }

  const { listing } = listingQuery.data;
  const deadline = describeDeadline(listing.challenge_deadline);
  const isAwaitingModeConfirmation = shownMode !== currentMode;
  // The offer the form revises: the version this page just stored, else the one stored before the page opened.
  const currentOffer: StoredOffer | null = submitted ?? ownOfferQuery.data.offer;
  // A version stored from this page answered the listing's scope at that moment; only the loaded one can predate a re-scope.
  const isOnCurrentScope = submitted !== null || (ownOfferQuery.data.offer?.answers_current_scope ?? true);

  const handleSubmit = async (payload: ChallengePayload): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      setSubmitted(await submitChallenge(id, payload));
      setIsConfirmationShown(true);
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

      {isAwaitingModeConfirmation ? (
        <section role="alert" style={{ backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '12px', margin: '1rem 0', padding: '1rem' }}>
          <strong>The owner changed bidding from {shownMode} to {currentMode} while you were writing.</strong>
          <p style={{ margin: '0.5rem 0' }}>
            {currentMode === 'open'
              ? 'An offer submitted now would show its price and scope to other challengers (never your identity).'
              : 'An offer submitted now would be sealed: only the owner would see its price.'}{' '}
            Nothing has been submitted. What you typed below is kept; review it under the new terms, then confirm to submit.
          </p>
          <button onClick={() => setShownMode(currentMode)} type="button">I’ve read the new terms: continue with {currentMode} bidding</button>
        </section>
      ) : null}

      {submitError ? (
        <ErrorState error={submitError} title={submitError.status === 409 ? 'Not submitted: the bidding terms changed' : 'Your offer was not submitted'} />
      ) : null}

      {submitted && isConfirmationShown ? <SubmittedOffer offer={submitted} onReviseAgain={() => setIsConfirmationShown(false)} /> : null}
      {!isConfirmationShown && deadline.isClosed ? (
        <EmptyState title="Closed to new offers">The deadline has passed, so offers and revisions are no longer accepted.</EmptyState>
      ) : null}
      {!isConfirmationShown && !deadline.isClosed ? (
        <>
          {currentOffer ? <ExistingOfferNotice isOnCurrentScope={isOnCurrentScope} offer={currentOffer} revisionMode={currentMode} /> : null}
          {/* Keyed by stored version: the form reads its starting terms once, so each newly stored version re-seeds it.
              The key doesn't change on a mode change or a rejected submit, so neither discards the draft. */}
          <ChallengeForm
            acknowledgedMode={isAwaitingModeConfirmation ? null : shownMode}
            initialOffer={currentOffer}
            isSubmitting={isSubmitting}
            key={currentOffer ? `${currentOffer.id}@${currentOffer.revised_at ?? currentOffer.submitted_at}` : 'new-offer'}
            listing={listing}
            onSubmit={handleSubmit}
          />
        </>
      ) : null}
    </section>
  );
}
