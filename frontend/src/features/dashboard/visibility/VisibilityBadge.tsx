/* Shows one expense's or listing's visibility state as a badge. Anything unrecognized reads as private (CLAUDE.md, visibility).
   Every private state carries the lock and the word "private"; public carries the globe and the word, so colour is never
   the only cue. Owner-only screens (Spend, My listings) use it. */
import { Badge, Icon } from '../../../shared/ui';

interface VisibilityBadgeProps {
  visibility: string;
  // Dense rows use "sm"; headers and drawers keep the default.
  size?: 'sm' | 'md';
}

/** Render the visibility state; unknown values render as private, the safe fallback. */
export function VisibilityBadge({ visibility, size = 'md' }: VisibilityBadgeProps): JSX.Element {
  const lock = <Icon name="lock" />;
  switch (visibility) {
    case 'public':
      return <Badge icon={<Icon name="globe" />} size={size} title="Visible on your public profile and in the markets." tone="success">Public</Badge>;
    case 'scope_confirmed':
      return <Badge icon={lock} size={size} title="Scope drafted but not published. Nobody else can see it." tone="private">Draft · private</Badge>;
    case 'closed':
      return <Badge size={size} tone="neutral">Closed</Badge>;
    case 'accepted':
      // Off the market: accepting closed bidding, so the listing no longer shows in the markets or takes offers.
      return <Badge icon={lock} size={size} title="You accepted an offer: bidding is closed and the listing is off the markets." tone="neutral">Accepted</Badge>;
    case 'shortlisted':
      return <Badge size={size} tone="neutral">Shortlisted</Badge>;
    case 'private':
      return <Badge icon={lock} size={size} title="Only this business can see it." tone="private">Private</Badge>;
    default:
      return <Badge icon={lock} size={size} title={`Unrecognized state "${visibility}" is treated as private.`} tone="private">Private (unknown state)</Badge>;
  }
}
