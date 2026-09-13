/* The Back / Next row at the foot of each publish step: Back on the left, the step's one primary action on the right.
   On a phone the primary action is drawn first and spans the width, where the thumb is. */
import type { ReactNode } from 'react';

import './StepNavigation.css';

interface StepNavigationProps {
  // Omitted on the first step.
  back?: ReactNode;
  next: ReactNode;
  // A sentence beside the actions, e.g. "Previewing publishes nothing."
  note?: ReactNode;
}

/** Render the step's navigation row. */
export function StepNavigation({ back, next, note }: StepNavigationProps): JSX.Element {
  return (
    <div className="publish-step-nav">
      {back ? <div className="publish-step-nav__back">{back}</div> : null}
      {note ? <p className="publish-step-nav__note">{note}</p> : null}
      <div className="publish-step-nav__next">{next}</div>
    </div>
  );
}
