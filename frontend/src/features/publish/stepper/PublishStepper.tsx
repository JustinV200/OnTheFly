/* The Scope → Preview → Publish indicator. Each step says its state in words ("Done", "Now", "Preview again"), so
   progress never rests on colour alone. Display only: Back and Next move between steps, and the flow decides what's allowed. */
import { Icon } from '../../../shared/ui';
import type { WizardStep } from './wizardStep';
import './PublishStepper.css';

const STEPS: Array<{ id: WizardStep; title: string }> = [
  { id: 'scope', title: 'Scope' },
  { id: 'preview', title: 'Preview' },
  { id: 'publish', title: 'Publish' },
];

type StepState = 'complete' | 'current' | 'upcoming' | 'redo';

interface PublishStepperProps {
  current: WizardStep;
  // A preview was discarded by an edit, so Preview must be done again rather than reading as "Next".
  isPreviewStale: boolean;
  // Once published, every step is done.
  isPublished?: boolean;
}

const STATE_WORDS: Record<StepState, string> = {
  complete: 'Done',
  current: 'Now',
  upcoming: 'Next',
  redo: 'Preview again',
};

/** Render the ordered step list with the current step marked for assistive technology. */
export function PublishStepper({ current, isPreviewStale, isPublished = false }: PublishStepperProps): JSX.Element {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol aria-label="Publish steps" className="publish-stepper">
      {STEPS.map((step, index) => {
        const state = stepState(index, currentIndex, step.id === 'preview' && isPreviewStale, isPublished);
        return (
          <li aria-current={state === 'current' ? 'step' : undefined} className={`publish-stepper__item publish-stepper__item--${state}`} key={step.id}>
            <span aria-hidden="true" className="publish-stepper__marker">
              {state === 'complete' ? <Icon name="check" size={14} /> : index + 1}
            </span>
            <span className="publish-stepper__text">
              <span className="publish-stepper__title">{step.title}</span>
              <span className="publish-stepper__state">{STATE_WORDS[state]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function stepState(index: number, currentIndex: number, isStalePreview: boolean, isPublished: boolean): StepState {
  if (isPublished || index < currentIndex) {
    return 'complete';
  }
  if (index === currentIndex) {
    return 'current';
  }
  return isStalePreview ? 'redo' : 'upcoming';
}
