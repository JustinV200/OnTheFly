/* The owner's controls for one listing, as a band under the summary tiles: bidding mode as Sealed / Open, visibility with
   a one-click Unpublish (or, while private, the way back to publishing), and sharing (copy link, invite suppliers, view as
   a stranger). Side by side from laptop width. A mode change is never retroactive; the hint says so before the change and
   the result says so after it. These are the page's only share buttons, so the no-offers state doesn't repeat them. */
import { Link } from 'react-router-dom';

import { ButtonLink, Card, CopyButton, Icon } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import { UnpublishButton } from '../../publish/UnpublishButton';
import { ListingVisibilityBadge } from '../header/ListingVisibilityBadge';
import type { InboxTaskSummary } from '../types';
import { BiddingModeControl } from './BiddingModeControl';
import { RepublishLink } from './RepublishLink';
import './ListingControls.css';

interface ListingControlsProps {
  listing: PublicListingProjection;
  // The listing's task, whose page a private listing opens to publish again; null for a listing without one.
  task: InboxTaskSummary | null;
  onChanged: () => void;
}

/** Render the bidding, visibility, and share controls for an owned listing. */
export function ListingControls({ listing, task, onChanged }: ListingControlsProps): JSX.Element {
  const isPublic = listing.visibility === 'public';
  const publicPath = `/listings/${listing.id}`;

  return (
    <Card className="listing-controls" label="Listing controls" padding="sm">
      <div className="listing-controls__rows">
        <BiddingModeControl listing={listing} onChanged={onChanged} />

        <div className="listing-controls__row listing-controls__row--inline">
          <div className="listing-controls__line">
            <span className="listing-controls__label">Visibility</span>
            <ListingVisibilityBadge visibility={listing.visibility} />
          </div>
          {isPublic ? (
            // Unpublishing is the safe direction: one visible click, never hidden in a menu (roadmap 11, principle 5).
            <UnpublishButton listingId={listing.id} onUnpublished={onChanged} size="sm" />
          ) : (
            <RepublishLink listing={listing} size="sm" task={task} />
          )}
        </div>

        <div className="listing-controls__row listing-controls__share">
          <span className="listing-controls__label">Share</span>
          {isPublic ? <CopyButton label="Copy link" size="sm" value={`${window.location.origin}${publicPath}`} /> : null}
          {isPublic ? (
            <ButtonLink iconStart={<Icon name="mail" size={15} />} size="sm" to={`${publicPath}/invite`}>Invite suppliers</ButtonLink>
          ) : null}
          <Link className="listing-controls__stranger" to={publicPath}>
            <Icon name="eye" size={14} />
            View as a stranger
          </Link>
        </div>
      </div>
    </Card>
  );
}
