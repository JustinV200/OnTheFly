/* One numbered step of the publish flow as a Card: "Step N" marker plus title, with the current step's border emphasised.
   The wrapper can take focus, so the flow can move keyboard and screen-reader users to a step that just filled in. */
import { forwardRef, ReactNode } from 'react';

import { Card } from '../../../shared/ui';
import type { StepStatus } from './publishStepStatuses';
import './StepCard.css';

interface StepCardProps {
  number: 1 | 2 | 3;
  title: string;
  status: StepStatus;
  description?: ReactNode;
  actions?: ReactNode;
  // The flow moves focus here when this step fills in; only such a card takes programmatic focus (never a tab stop).
  isFocusTarget?: boolean;
  children: ReactNode;
}

/** Render a step card; the forwarded ref points at the wrapper, which is focusable only when isFocusTarget is set. */
export const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard({ number, title, status, description, actions, isFocusTarget = false, children }, ref) {
  return (
    <div className="publish-step-card" ref={ref} tabIndex={isFocusTarget ? -1 : undefined}>
      <Card
        actions={actions}
        className={`publish-step-card__surface publish-step-card__surface--${status}`}
        description={description}
        title={
          <span className="publish-step-card__title">
            <span aria-hidden="true" className="publish-step-card__number">{number}</span>
            <span className="ui-visually-hidden">Step {number}: </span>
            {title}
          </span>
        }
      >
        {children}
      </Card>
    </div>
  );
});
