/* Shows whether the listing is public. Anything but an explicit "public" reads as private, the safe fallback (CLAUDE.md, visibility). */
import { Badge, Icon } from '../../../shared/ui';

/** Render "Public" or "Private" for a listing's stored visibility, naming any unusual stored state in words. */
export function ListingVisibilityBadge({ visibility }: { visibility: string }): JSX.Element {
  if (visibility === 'public') {
    return (
      <Badge icon={<Icon name="eye" />} title="Visible in the marketplace and on your public profile." tone="success">
        Public
      </Badge>
    );
  }
  if (visibility === 'accepted') {
    // Still off the markets, like private; named for what happened rather than as a raw state in brackets.
    return (
      <Badge icon={<Icon name="lock" />} title="You accepted an offer: bidding is closed and the listing is off the markets." tone="private">
        Accepted · off the markets
      </Badge>
    );
  }
  return (
    <Badge icon={<Icon name="lock" />} title="Nobody else can see this listing." tone="private">
      {visibility === 'private' ? 'Private' : `Private (${visibility})`}
    </Badge>
  );
}
