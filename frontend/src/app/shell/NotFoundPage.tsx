/* Renders the page for a URL that matches no route. */
import { Link } from 'react-router-dom';

import { EmptyState } from '../../shared/components/EmptyState';

/** Render a defined state for unknown URLs. */
export function NotFoundPage(): JSX.Element {
  return (
    <EmptyState action={<Link to="/marketplace">Browse the marketplace</Link>} title="There’s no page at this address">
      The link may be mistyped, or it pointed at something that no longer exists.
    </EmptyState>
  );
}
