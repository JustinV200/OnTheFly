/* The three-step indicator at the top of the publish flow: confirm the scope, preview what goes public, publish.
   Each step says its status in words ("Done", "Now", "Next"), so progress never depends on the marker colour. */
import { Icon } from '../../../shared/ui';
import type { PublishStep } from '../usePublish';
import { publishStepStatuses, StepStatus } from './publishStepStatuses';
import './PublishSteps.css';

const STEPS = [
  { title: 'Confirm the scope', description: 'Private. Only you see this form.' },
  { title: 'Preview what goes public', description: 'The exact payload, field for field.' },
  { title: 'Publish', description: 'The only step that makes it public.' },
];

const STATUS_WORDS: Record<StepStatus, string> = {
  complete: 'Done',
  current: 'Now',
  upcoming: 'Next',
};

interface PublishStepsProps {
  step: PublishStep;
}

/** Render the ordered step list with the current step marked for assistive technology. */
export function PublishSteps({ step }: PublishStepsProps): JSX.Element {
  const statuses = publishStepStatuses(step);

  return (
    <ol aria-label="Publish steps" className="publish-steps">
      {STEPS.map((item, index) => {
        const status = statuses[index];
        return (
          <li aria-current={status === 'current' ? 'step' : undefined} className={`publish-steps__item publish-steps__item--${status}`} key={item.title}>
            <span aria-hidden="true" className="publish-steps__marker">
              {status === 'complete' ? <Icon name="check" size={14} /> : index + 1}
            </span>
            <span className="publish-steps__text">
              <span className="publish-steps__status">Step {index + 1} · {STATUS_WORDS[status]}</span>
              <span className="publish-steps__title">{item.title}</span>
              <span className="publish-steps__description">{item.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
