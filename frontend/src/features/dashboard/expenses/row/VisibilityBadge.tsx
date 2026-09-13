/* Shows one expense's visibility state as a badge. Anything unrecognized reads as private (CLAUDE.md, visibility).
   Every private state carries the lock and the word "private"; public carries the eye and the word, so colour is never the only cue. */
import { Badge, Icon } from '../../../../shared/ui';

interface VisibilityBadgeProps {
  visibility: string;
}

/** Render the visibility state; unknown values render as private, the safe fallback. */
export function VisibilityBadge({ visibility }: VisibilityBadgeProps): JSX.Element {
  const lock = <Icon name="lock" />;
  switch (visibility) {
    case 'public':
      return <Badge icon={<Icon name="eye" />} size="md" title="Visible on your public profile and in the marketplace." tone="success">Public</Badge>;
    case 'scope_confirmed':
      return <Badge icon={lock} size="md" title="Scope drafted but not published. Nobody else can see it." tone="private">Draft · private</Badge>;
    case 'closed':
      return <Badge size="md" tone="neutral">Closed</Badge>;
    case 'shortlisted':
      return <Badge size="md" tone="neutral">Shortlisted</Badge>;
    case 'private':
      return <Badge icon={lock} size="md" title="Only this business can see it." tone="private">Private</Badge>;
    default:
      return <Badge icon={lock} size="md" title={`Unrecognized state "${visibility}" is treated as private.`} tone="private">Private (unknown state)</Badge>;
  }
}
