/* The demo script as a checklist: who acts, what to do, whether it has happened, and one button that switches to that
   business and opens the right page. The first unfinished step is marked "Next". */
import { useNavigate } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { demoAccounts } from '../../shared/account/demoAccounts';
import { Badge, Button, Card, Icon } from '../../shared/ui';
import { ActorDot } from './ActorDot';
import type { ChainStep } from './chainSteps';

interface StepListProps {
  steps: ChainStep[];
}

/** Render the step checklist. */
export function StepList({ steps }: StepListProps): JSX.Element {
  const { setAccountId } = useActingAccount();
  const navigate = useNavigate();
  const nextIndex = steps.findIndex((step) => !step.isDone);

  return (
    <Card description="Each step turns green when the business it concerns can see it happened." title="The story, step by step">
      <ol className="demo-steps">
        {steps.map((step, index) => {
          const account = demoAccounts.find((candidate) => candidate.id === step.actorId) ?? null;
          const isNext = index === nextIndex;
          return (
            <li className={`demo-steps__item${isNext ? ' demo-steps__item--next' : ''}`} key={step.id}>
              <span aria-hidden="true" className={`demo-steps__mark${step.isDone ? ' demo-steps__mark--done' : ''}`}>
                {step.isDone ? <Icon name="check" size={14} /> : index + 1}
              </span>
              <div className="demo-steps__body">
                <p className="demo-steps__title">
                  {step.title}{' '}
                  {step.isDone ? <Badge tone="success">Done</Badge> : isNext ? <Badge tone="brand">Next</Badge> : null}
                </p>
                <p className="demo-steps__actor">
                  <ActorDot color={account?.color ?? null} /> {step.actorName}
                </p>
                <p className="demo-steps__detail">{step.detail}</p>
              </div>
              {step.path ? (
                <Button
                  iconEnd={<Icon name="arrow-right" size={14} />}
                  onClick={() => {
                    setAccountId(step.actorId);
                    navigate(step.path ?? '/');
                  }}
                  size="sm"
                  variant={isNext ? 'primary' : 'secondary'}
                >
                  Act as {step.actorName.split(' ').slice(0, 2).join(' ')}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
