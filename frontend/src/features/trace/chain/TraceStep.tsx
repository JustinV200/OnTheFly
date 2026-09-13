/* One numbered link in the trace chain: a marker on the vertical rail, the step's card, and a "comes from" link to the next step. */
import type { ReactNode } from 'react';

import { Card } from '../../../shared/ui';
import './TraceStep.css';

interface TraceStepProps {
  step: number;
  title: ReactNode;
  // Badges read with the step before its figures: provenance, bidding mode, visibility, fly-brain labels.
  badges?: ReactNode;
  // What the next step down explains about this one; omitted on the last step.
  leadsTo?: string;
  children: ReactNode;
}

/** Render one step as a list item inside the trace's ordered list, with the link down to the next step when there is one. */
export function TraceStep({ step, title, badges, leadsTo, children }: TraceStepProps): JSX.Element {
  return (
    <li className="trace-step" id={`trace-step-${step}`}>
      {/* The visible number is decorative; the heading carries "Step N" for screen readers. */}
      <span aria-hidden="true" className="trace-step__marker">{step}</span>
      <div className="trace-step__body">
        <Card
          actions={badges}
          title={<span className="trace-step__title"><span className="ui-visually-hidden">Step {step}: </span>{title}</span>}
        >
          {children}
        </Card>
        {leadsTo ? (
          <p className="trace-step__next">
            <a href={`#trace-step-${step + 1}`}>
              <span aria-hidden="true">↓ </span>Comes from: {leadsTo}
            </a>
          </p>
        ) : null}
      </div>
    </li>
  );
}
