/* Shows one expense's visibility state as a pill. Anything unrecognized reads as private (CLAUDE.md, visibility). */
import { Pill } from '../../shared/components/Pill';

interface VisibilityBadgeProps {
  visibility: string;
}

/** Render the visibility state; unknown values render as private, the safe fallback. */
export function VisibilityBadge({ visibility }: VisibilityBadgeProps): JSX.Element {
  switch (visibility) {
    case 'public':
      return <Pill title="Visible on your public profile and in the marketplace." tone="success">● Public</Pill>;
    case 'scope_confirmed':
      return <Pill title="Scope drafted but not published. Nobody else can see it." tone="warning">Draft · private</Pill>;
    case 'closed':
      return <Pill tone="neutral">Closed</Pill>;
    case 'shortlisted':
      return <Pill tone="neutral">Shortlisted</Pill>;
    case 'private':
      return <Pill title="Only this business can see it." tone="private">🔒 Private</Pill>;
    default:
      return <Pill title={`Unrecognized state "${visibility}" is treated as private.`} tone="private">🔒 Private (unknown state)</Pill>;
  }
}
