/* The task page's next step, with a primary action that performs it: Preview and publish opens the publish drawer,
   Review offers opens the offer list and focuses it, Ways to save brings the top suggestion into view, and piece steps
   link to the piece. A blocked split shows as a visibly disabled button with its reason beside it. */
import { useId } from 'react';

import { Button, ButtonLink, Callout } from '../../../shared/ui';
import type { NextStep, StepAction } from './nextStep';
import './NextStepCallout.css';

export interface StepHandlers {
  onPublish: () => void;
  onReviewOffers: () => void;
  onWaysToSave: () => void;
  onSplitManually: () => void;
  onDetails: () => void;
}

interface NextStepCalloutProps {
  step: NextStep | null;
  handlers: StepHandlers;
}

/** Render the next-step callout, or nothing when there is no step. */
export function NextStepCallout({ step, handlers }: NextStepCalloutProps): JSX.Element | null {
  if (!step) {
    return null;
  }
  const hasActions = step.primary !== null || step.secondary.length > 0;
  return (
    <Callout
      actions={hasActions ? (
        <>
          {step.primary ? <ActionControl action={step.primary} handlers={handlers} isPrimary /> : null}
          {step.secondary.map((action) => <ActionControl action={action} handlers={handlers} isPrimary={false} key={`${action.kind}-${action.label}`} />)}
        </>
      ) : undefined}
      role="note"
      title={step.title}
      tone="brand"
    >
      <p>{step.body}</p>
    </Callout>
  );
}

function ActionControl({ action, handlers, isPrimary }: { action: StepAction; handlers: StepHandlers; isPrimary: boolean }): JSX.Element {
  const reasonId = useId();
  const variant = isPrimary ? 'primary' : 'secondary';
  switch (action.kind) {
    case 'link':
      return <ButtonLink to={action.to} variant={variant}>{action.label}</ButtonLink>;
    case 'publish':
      return <Button onClick={handlers.onPublish} variant={variant}>{action.label}</Button>;
    case 'reviewOffers':
      return <Button onClick={handlers.onReviewOffers} variant={variant}>{action.label}</Button>;
    case 'waysToSave':
      return <Button onClick={handlers.onWaysToSave} variant={variant}>{action.label}</Button>;
    case 'splitManually':
      return <Button onClick={handlers.onSplitManually} variant={variant}>{action.label}</Button>;
    case 'details':
      return <Button onClick={handlers.onDetails} variant={variant}>{action.label}</Button>;
    case 'splitBlocked':
      return (
        <span className="next-step__blocked">
          <Button aria-describedby={reasonId} disabled variant="secondary">{action.label}</Button>
          <span className="next-step__reason" id={reasonId}>{action.reason}</span>
        </span>
      );
  }
}
