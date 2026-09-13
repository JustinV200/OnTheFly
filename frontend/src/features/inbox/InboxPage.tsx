/* The owner's Offers page for one listing, read like a market from the owner's side: the header, a summary strip with
   the listing's controls, any genuine offer, then one ranked list with "What you pay now" pinned on top. A row opens the
   offer drawer. It polls, so an offer made by another business shows up after switching back without a refresh. */
import { ReactNode, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ButtonLink, Callout, Stack } from '../../shared/ui';
import { ListingControls } from './controls/ListingControls';
import { OfferDrawer } from './detail/OfferDrawer';
import { GenuineOfferCallout } from './genuine/GenuineOfferCallout';
import { InboxHeader } from './header/InboxHeader';
import { NoOffersState } from './offers/NoOffersState';
import { RankedOffersSection } from './offers/RankedOffersSection';
import { SummaryStrip } from './summary/SummaryStrip';
import { useInbox } from './useInbox';

/** Render the owner's Offers page for one listing. */
export function InboxPage(): JSX.Element {
  const { id = '' } = useParams();
  const { account } = useActingAccount();
  const { inbox, comparison, ownerOffers, reload } = useInbox(id);
  const [openOfferId, setOpenOfferId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (inbox.error?.status === 404 || inbox.error?.status === 401) {
    // Same message whether the listing is missing or belongs to someone else, so ids can't be probed.
    return (
      <InboxPageFrame>
        <EmptyState action={<ButtonLink to="/marketplace">Back to the marketplace</ButtonLink>} title="Only this listing’s owner can see its offers">
          {account ? `You're acting as ${account.businessName}, which doesn't own this listing.` : 'Pick the owning business in the bar above.'}{' '}
          Other challengers never see who made an offer.
        </EmptyState>
      </InboxPageFrame>
    );
  }
  if (!inbox.data) {
    return (
      <InboxPageFrame>
        {inbox.error
          ? <ErrorState error={inbox.error} onRetry={reload} title="Couldn’t load offers" />
          : <LoadingSpinner label="Loading offers…" />}
      </InboxPageFrame>
    );
  }

  const { listing, challenges, current_scope_version_number: currentScopeVersionNumber } = inbox.data;
  // Looked up on every poll, so the drawer shows fresh figures and closes itself if the offer is withdrawn.
  const openOffer = challenges.find((challenge) => challenge.challenge_id === openOfferId) ?? null;
  const incumbent = comparison.data?.rows.find((row) => row.is_incumbent) ?? null;
  const task = inbox.data.task ?? null;
  const acceptedName = task?.accepted_challenge_id
    ? challenges.find((challenge) => challenge.challenge_id === task.accepted_challenge_id)?.challenger_name ?? 'The bidder'
    : null;

  return (
    <Stack gap={6}>
      <InboxHeader listing={listing} />
      {task && acceptedName ? (
        <Callout
          actions={<ButtonLink to={`/tasks/${task.id}`} variant="primary">Open the task</ButtonLink>}
          role="status"
          title={`You accepted ${acceptedName}’s offer`}
          tone="success"
        >
          <p>Bidding is closed and {acceptedName} owns this task now. You stay its client; what they split off is theirs to manage.</p>
        </Callout>
      ) : task ? (
        <Callout actions={<ButtonLink to={`/tasks/${task.id}`}>Open the task</ButtonLink>} role="note" title="Pick an offer to accept" tone="info">
          <p>Open an offer to review accepting it. Accepting closes bidding and makes that bidder the task owner.</p>
        </Callout>
      ) : null}
      {listing.visibility !== 'public' && listing.visibility !== 'accepted' ? (
        <Callout role="status" title="This listing is private now" tone="private">
          <p>Nobody else can see it. The offers below arrived while it was public and are kept for you.</p>
        </Callout>
      ) : null}
      {inbox.error ? <ErrorState error={inbox.error} onRetry={reload} title="Showing the last loaded offers; a refresh failed" /> : null}

      <SummaryStrip
        controls={<ListingControls listing={listing} onChanged={reload} />}
        listing={listing}
        offers={challenges}
        onOpenOffer={setOpenOfferId}
      />
      <GenuineOfferCallout offers={ownerOffers} onOpenOffer={setOpenOfferId} />

      {challenges.length === 0 ? (
        <NoOffersState listing={listing} />
      ) : (
        <RankedOffersSection
          comparisonError={comparison.data ? null : comparison.error}
          currentScopeVersionNumber={currentScopeVersionNumber}
          incumbent={incumbent}
          listing={listing}
          offers={challenges}
          onOpenOffer={setOpenOfferId}
          onRetry={reload}
        />
      )}

      <OfferDrawer
        hasExpense={listing.expense_id !== null}
        offer={openOffer}
        onAccepted={(accepted) => navigate(`/tasks/${accepted.id}`)}
        onClose={() => setOpenOfferId(null)}
        ownerOffers={ownerOffers}
        task={task}
      />
    </Stack>
  );
}

// Gives the states shown before the inbox loads the page's h1, so no message sits under a missing heading.
function InboxPageFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Stack gap={6}>
      <InboxHeader listing={null} />
      {children}
    </Stack>
  );
}
