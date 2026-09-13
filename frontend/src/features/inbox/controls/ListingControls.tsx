/* The owner's controls for one listing, as a band under the summary tiles: bidding mode as Sealed / Open, visibility with
   a one-click Unpublish, and sharing (copy link, invite suppliers, view as a stranger). Side by side from laptop width.
   A mode change is never retroactive; the hint says so before the change and the result says so after it. */
import { Link } from 'react-router-dom';

import { ButtonLink, Card, CopyButton, Icon } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import { UnpublishButton } from '../../publish/UnpublishButton';
import { ListingVisibilityBadge } from '../header/ListingVisibilityBadge';
import { BiddingModeControl } from './BiddingModeControl';
import './ListingControls.css';

interface ListingControlsProps {
  listing: PublicListingProjection;
  onChanged: () => void;
}

/** Render the bidding, visibility, and share controls for an owned listing. */
export function ListingControls({ listing, onChanged }: ListingControlsProps): JSX.Element {
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
            <ButtonLink size="sm" to={`/publish?expense=${listing.expense_id}`}>Publish again…</ButtonLink>
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
