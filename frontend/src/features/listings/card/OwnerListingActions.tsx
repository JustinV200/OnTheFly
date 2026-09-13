/* The owner's actions on one listing. Public: Offers (primary), Invite suppliers, View as a stranger, and a visible
   one-click Unpublish that reuses the publish feature's button. Private: the retained offers, or finishing a draft: on its
   task page when REBID covers the category, else through the older publish wizard (publish/path). Nothing here publishes;
   that only happens after an exact preview (CLAUDE.md, visibility). */
import { ButtonLink, Icon } from '../../../shared/ui';
import { usesPublishWizard } from '../../publish/path/usesPublishWizard';
import { UnpublishButton } from '../../publish/UnpublishButton';
import type { OwnerListing } from '../useOwnerListings';
import type { ListingStatus } from './listingStatus';

interface OwnerListingActionsProps {
  listing: OwnerListing;
  status: ListingStatus;
  onUnpublished: () => void;
}

/** Render the action row for one listing card. */
export function OwnerListingActions({ listing, status, onUnpublished }: OwnerListingActionsProps): JSX.Element {
  const { listingId, expense } = listing;
  const offersLabel = status.offerCount === null ? 'Offers' : `Offers (${status.offerCount})`;

  if (status.isPublic) {
    return (
      <div className="owner-listing__actions">
        <ButtonLink size="sm" to={`/listings/${listingId}/inbox`} variant="primary">{offersLabel}</ButtonLink>
        <ButtonLink iconStart={<Icon name="mail" />} size="sm" to={`/listings/${listingId}/invite`}>Invite suppliers</ButtonLink>
        <ButtonLink iconStart={<Icon name="eye" />} size="sm" to={`/listings/${listingId}`} variant="ghost">View as a stranger</ButtonLink>
        <span className="owner-listing__unpublish">
          <UnpublishButton listingId={listingId} onUnpublished={onUnpublished} size="sm" />
        </span>
      </div>
    );
  }
  const taskId = listing.inbox.phase === 'loaded' ? listing.inbox.inbox.task?.id ?? null : null;
  const category = status.record?.category ?? expense.category;
  if (status.isDraft && taskId && !usesPublishWizard(category)) {
    // The task page previews and publishes the draft, and holds its requirements and Ways to save.
    return (
      <div className="owner-listing__actions">
        <ButtonLink size="sm" to={`/tasks/${taskId}`} variant="primary">Open task</ButtonLink>
      </div>
    );
  }
  if (status.isDraft && expense.is_publishable) {
    return (
      <div className="owner-listing__actions">
        <ButtonLink size="sm" to={`/publish?expense=${expense.id}`} variant="primary">Continue to publish…</ButtonLink>
      </div>
    );
  }
  return (
    <div className="owner-listing__actions">
      {/* An unpublished listing keeps the offers it received while public. */}
      <ButtonLink size="sm" to={`/listings/${listingId}/inbox`} variant="primary">{offersLabel}</ButtonLink>
    </div>
  );
}
