/* The poster's side of its task's listing: where it stands (private, confirmed, public, accepted), the actions for that
   state, and the offers to accept while bidding is open. The publish drawer lives on the task page, so the next-step
   callout and this card open the same one; when the callout already offers publishing, this card doesn't repeat it (one
   primary action per screen). Unpublish stays one click and never danger-styled. */
import { useRef } from 'react';

import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix, describeClosesIn } from '../../../shared/market';
import { Badge, Button, ButtonLink, Card, Cluster, Icon, Stack, useFocusOnRequest } from '../../../shared/ui';
import { UnpublishButton } from '../../publish/UnpublishButton';
import { stateLabel } from '../labels/taskLabels';
import type { TaskDetail } from '../types';
import { OffersToAccept } from './OffersToAccept';

interface TaskListingSectionProps {
  task: TaskDetail;
  onChanged: () => void;
  onPublish: () => void;
  // True when the next-step callout's primary action is already "Preview and publish".
  isPublishInCallout: boolean;
  onAccepted: (bidderName: string) => void;
  // Set by the next-step "Review offers"; handled by the offer list, or by this card when there is no list to show.
  isOffersFocusRequested: boolean;
  onOffersFocusHandled: () => void;
}

/** Render the listing status card, its actions, and the offers list. */
export function TaskListingSection(props: TaskListingSectionProps): JSX.Element {
  const { task, onChanged, onPublish, isPublishInCallout, onAccepted, isOffersFocusRequested, onOffersFocusHandled } = props;
  const cardRef = useRef<HTMLDivElement>(null);
  const listing = task.listing;
  const isAccepted = task.state === 'accepted';
  const showsOffers = listing !== null && !isAccepted && (listing.offer_count > 0 || listing.visibility === 'public');
  useFocusOnRequest(cardRef, isOffersFocusRequested && !showsOffers, true, onOffersFocusHandled);

  if (!listing) {
    return <Card title="Listing"><p className="ui-text-muted">This task has no listing yet.</p></Card>;
  }
  const state = stateLabel(listing.visibility);
  const closes = describeClosesIn(listing.challenge_deadline);
  const isPublic = listing.visibility === 'public';
  // A REBID confirms its scope (and current price) on its scope form, so only a confirmed one can be previewed here. A
  // piece closed by undoing its split gave its requirements back to its parent, so it isn't offered for publishing.
  const isUndonePiece = task.origin === 'split' && listing.visibility === 'closed';
  const canPublish = !isAccepted && !isPublic && !isUndonePiece && (task.origin !== 'rebid' || listing.visibility === 'scope_confirmed');

  return (
    <Stack gap={5}>
      <div ref={cardRef} tabIndex={-1}>
        <Card
          actions={(
            <>
              <Badge tone={state.tone}>{state.text}</Badge>
              <BiddingModePill mode={listing.bidding_mode} />
            </>
          )}
          description={`Scope v${listing.scope_version_number}`}
          title="Your listing"
        >
          <Stack gap={4}>
            <p className="ui-text-sm">
              Stated price{' '}
              {listing.stated_price_minor === null ? (
                <strong>none (no budget)</strong>
              ) : (
                <strong><MoneyDisplay amountMinor={listing.stated_price_minor} currency={task.currency} /> {cadenceSuffix(task.billing_period)}</strong>
              )}
              {' · '}
              {listing.price_disclosed ? 'shown on the public listing' : <><Icon name="lock" size={12} /> hidden from the public listing</>}
              {isPublic ? ` · ${closes.label}` : ''}
            </p>
            <Cluster gap={2}>
              {canPublish && !isPublishInCallout ? (
                <Button iconStart={<Icon name="eye" />} onClick={onPublish} variant="primary">
                  Preview and publish
                </Button>
              ) : null}
              {!isAccepted ? (
                <ButtonLink to={`/tasks/${task.id}/edit`}>Edit scope</ButtonLink>
              ) : null}
              {isPublic ? <ButtonLink iconStart={<Icon name="globe" />} to={`/listings/${listing.id}`}>View as a stranger</ButtonLink> : null}
              {isPublic ? <UnpublishButton listingId={listing.id} onUnpublished={onChanged} /> : null}
            </Cluster>
            {isAccepted ? <p className="ui-text-sm ui-text-muted">An offer was accepted, so this listing is closed and out of public view.</p> : null}
          </Stack>
        </Card>
      </div>

      {showsOffers ? (
        <OffersToAccept
          isFocusRequested={isOffersFocusRequested}
          listingId={listing.id}
          onAccepted={onAccepted}
          onFocusHandled={onOffersFocusHandled}
          taskId={task.id}
        />
      ) : null}
    </Stack>
  );
}
