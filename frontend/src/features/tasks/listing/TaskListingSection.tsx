/* The poster's side of its task's listing: where it stands (private, confirmed, public, accepted), the one next action
   for that state, and the offers to accept while bidding is open. Unpublish stays one click and never danger-styled. */
import { useState } from 'react';

import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix, describeClosesIn } from '../../../shared/market';
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { Badge, Button, ButtonLink, Card, Cluster, Icon, Stack } from '../../../shared/ui';
import { UnpublishButton } from '../../publish/UnpublishButton';
import { stateLabel } from '../labels/taskLabels';
import { TaskPublishDrawer } from '../publish/TaskPublishDrawer';
import type { TaskDetail } from '../types';
import { OffersToAccept } from './OffersToAccept';

interface TaskListingSectionProps {
  task: TaskDetail;
  onChanged: () => void;
}

/** Render the listing status card, its actions, and the offers list. */
export function TaskListingSection({ task, onChanged }: TaskListingSectionProps): JSX.Element {
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const listing = task.listing;
  if (!listing) {
    return <Card title="Listing"><p className="ui-text-muted">This task has no listing yet.</p></Card>;
  }
  const state = stateLabel(listing.visibility);
  const closes = describeClosesIn(listing.challenge_deadline);
  const isPublic = listing.visibility === 'public';
  const isAccepted = task.state === 'accepted';
  // A REBID confirms its scope (and current price) on the REBID form, so only a confirmed one can be previewed here.
  const canPublish = !isAccepted && !isPublic && (task.origin !== 'rebid' || listing.visibility === 'scope_confirmed');

  return (
    <Stack gap={5}>
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
            {canPublish ? (
              <Button iconStart={<Icon name="eye" />} onClick={() => setIsPublishOpen(true)} variant="primary">
                {task.origin !== 'rebid' && listing.visibility !== 'scope_confirmed' ? 'Confirm, preview and publish' : 'Preview and publish'}
              </Button>
            ) : null}
            {task.origin === 'rebid' && !isAccepted && task.expense_id ? (
              <ButtonLink to={`/tasks/new?expense=${task.expense_id}`}>Edit REBID scope</ButtonLink>
            ) : null}
            {isPublic ? <ButtonLink iconStart={<Icon name="globe" />} to={`/listings/${listing.id}`}>View as a stranger</ButtonLink> : null}
            {isPublic ? <UnpublishButton listingId={listing.id} onUnpublished={onChanged} /> : null}
          </Cluster>
          {isAccepted ? <p className="ui-text-sm ui-text-muted">An offer was accepted, so this listing is closed and out of public view.</p> : null}
        </Stack>
      </Card>

      {listing.offer_count > 0 || isPublic ? (
        isAccepted ? null : <OffersToAccept listingId={listing.id} onAccepted={onChanged} taskId={task.id} />
      ) : null}

      <TaskPublishDrawer isOpen={isPublishOpen} onClose={() => setIsPublishOpen(false)} onPublished={onChanged} task={task} />
    </Stack>
  );
}
