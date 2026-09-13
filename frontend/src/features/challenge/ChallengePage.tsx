/* Hosts the challenge form for one public listing and every way submitting can go wrong.
   The mode shown when the form opened is what the challenger acknowledges; a later change must be re-confirmed before
   submitting, and the form stays mounted meanwhile so the draft survives. A returning challenger's form starts from their offer.
   On wide screens the challenged price and any mode change sit in an aside that stays in view beside the form. */
import { ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { ApiError } from '../../shared/api/client';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { describeDeadline } from '../../shared/format/describeDeadline';
import { ButtonLink, PageHeader, Stack } from '../../shared/ui';
import type { MarketplaceListing } from '../marketplace/types';
import { ChallengeForm } from './form/ChallengeForm';
import { ChallengedPriceCard } from './status/ChallengedPriceCard';
import { ExistingOfferNotice } from './status/ExistingOfferNotice';
import { ModeChangeAlert } from './status/ModeChangeAlert';
import { SubmittedOffer } from './status/SubmittedOffer';
import type { BiddingModeValue, ChallengePayload, ChallengeResponse, OwnOfferResponse, StoredOffer } from './types';
import { useChallenge } from './useChallenge';
import './ChallengePage.css';

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
      <ChallengePageFrame>
        <EmptyState action={<ButtonLink to={`/listings/${id}`}>View the listing</ButtonLink>} title="Pick a business to challenge as">
          Offers come from a business on the platform. Choose one in the bar above. Visitors can still view the listing.
        </EmptyState>
      </ChallengePageFrame>
    );
  }
  if (listingQuery.error?.status === 404) {
    return (
      <ChallengePageFrame>
        <EmptyState action={<ButtonLink to="/marketplace">Back to the marketplace</ButtonLink>} title="This listing is no longer public">
          {submitted
            ? 'Its owner unpublished it after your offer was recorded. Your offer is kept with the owner.'
            : ownOfferQuery.data?.offer
              ? 'Its owner unpublished it. Your existing offer is kept with the owner; nothing you typed here was submitted.'
              : 'Its owner unpublished it. Nothing you typed here was submitted.'}
        </EmptyState>
      </ChallengePageFrame>
    );
  }
  if (!listingQuery.data || !currentMode || !shownMode) {
    return (
      <ChallengePageFrame>
        {listingQuery.error
          ? <ErrorState error={listingQuery.error} onRetry={listingQuery.reload} title="Couldn’t load this listing" />
          : <LoadingSpinner label="Loading listing terms…" />}
      </ChallengePageFrame>
    );
  }
  if (!ownOfferQuery.data) {
    // No form until this resolves: a blank form submitted over a stored offer would replace every one of its terms.
    return (
      <ChallengePageFrame>
        {ownOfferQuery.error
          ? (
            <ErrorState error={ownOfferQuery.error} onRetry={ownOfferQuery.reload} title="Couldn’t check for your existing offer">
              <p>The form stays hidden until this loads, so a blank form can’t replace an offer you already made.</p>
            </ErrorState>
          )
          : <LoadingSpinner label="Checking for your existing offer…" />}
      </ChallengePageFrame>
    );
  }

  const { listing } = listingQuery.data;
  const deadline = describeDeadline(listing.challenge_deadline);
  const isAwaitingModeConfirmation = shownMode !== currentMode;
  // The offer the form revises: the version this page just stored, else the one stored before the page opened.
  const currentOffer: StoredOffer | null = submitted ?? ownOfferQuery.data.offer;
  // A version stored from this page answered the listing's scope at that moment; only the loaded one can predate a re-scope.
  const isOnCurrentScope = submitted !== null || (ownOfferQuery.data.offer?.answers_current_scope ?? true);
  const isFormShown = !isConfirmationShown && !deadline.isClosed;

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

  // Shown right above the submit button while the form is up, since that is where the challenger is looking;
  // at the top of the page otherwise, so a rejection is never hidden along with the form.
  const submitProblem = submitError ? (
    <ErrorState error={submitError} title={submitError.status === 409 ? 'Not submitted: the bidding terms changed' : 'Your offer was not submitted'} />
  ) : null;

  return (
    <Stack gap={6}>
      <PageHeader
        eyebrow={<Link to={`/listings/${listing.id}`}>← Back to the listing</Link>}
        title={`Challenge: ${categoryLabel(listing.category)}, ${listing.service_area_approximate}`}
      />
      <div className="challenge-page__layout">
        <aside aria-label="The price you are challenging" className="challenge-page__aside">
          <Stack gap={4}>
            {isAwaitingModeConfirmation ? (
              <ModeChangeAlert currentMode={currentMode} onConfirm={() => setShownMode(currentMode)} shownMode={shownMode} />
            ) : null}
            <ChallengedPriceCard deadline={deadline} listing={listing} />
          </Stack>
        </aside>

        <Stack className="challenge-page__main" gap={5}>
          {isFormShown ? null : submitProblem}
          {submitted && isConfirmationShown ? <SubmittedOffer offer={submitted} onReviseAgain={() => setIsConfirmationShown(false)} /> : null}
          {!isConfirmationShown && deadline.isClosed ? (
            <EmptyState title="Closed to new offers">The deadline has passed, so offers and revisions are no longer accepted.</EmptyState>
          ) : null}
          {isFormShown ? (
            <>
              {currentOffer ? <ExistingOfferNotice isOnCurrentScope={isOnCurrentScope} offer={currentOffer} revisionMode={currentMode} /> : null}
              {/* Keyed by stored version: the form reads its starting terms once, so each newly stored version re-seeds it.
                  The key doesn't change on a mode change or a rejected submit, so neither discards the draft. */}
              <ChallengeForm
                acknowledgedMode={isAwaitingModeConfirmation ? null : shownMode}
                currentMode={currentMode}
                initialOffer={currentOffer}
                isSubmitting={isSubmitting}
                key={currentOffer ? `${currentOffer.id}@${currentOffer.revised_at ?? currentOffer.submitted_at}` : 'new-offer'}
                listing={listing}
                onConfirmMode={() => setShownMode(currentMode)}
                onSubmit={handleSubmit}
                submitProblem={submitProblem}
              />
            </>
          ) : null}
        </Stack>
      </div>
    </Stack>
  );
}

// Gives the states shown before the listing loads the page's h1, so no message sits under a missing heading.
function ChallengePageFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Stack gap={6}>
      <PageHeader title="Challenge this price" />
      {children}
    </Stack>
  );
}
