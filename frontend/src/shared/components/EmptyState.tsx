/* Renders an intentional empty state: what is missing, why that's normal, and what to do next.
   A blank area reads as broken; a sentence reads as a product that knows this happens. */
import type { ReactNode } from 'react';

import { Card } from '../ui';
import './pageStates.css';

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** Render a dashed empty-state card with an optional explanation and action. */
export function EmptyState({ title, children, action }: EmptyStateProps): JSX.Element {
  return (
    <Card className="page-state" padding="lg" title={title} titleLevel={3} tone="outlined">
      {children ? <div className="page-state__body">{children}</div> : null}
      {action ? <div className="page-state__action">{action}</div> : null}
    </Card>
  );
}
