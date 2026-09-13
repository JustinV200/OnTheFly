/* The rail's content: the presenter-tool label, the next step of the task chain (number, the business that acts, what to
   do) with its action, or "Chain complete" once every step is done; then a link to the full guide and a hide control.
   It polls the three chain businesses' views while mounted, which is why DemoRail mounts it only where it shows. */
import { Link } from 'react-router-dom';

import { AccountAvatar } from '../../../shared/account/AccountAvatar';
import { demoAccounts } from '../../../shared/account/demoAccounts';
import { Badge, Icon } from '../../../shared/ui';
import { useChainProgress } from '../progress/useChainProgress';
import { RailStepAction } from './RailStepAction';
import './DemoRail.css';

interface DemoRailStripProps {
  onHide: () => void;
}

/** Render the rail strip for the chain's current progress. */
export function DemoRailStrip({ onHide }: DemoRailStripProps): JSX.Element {
  const { failure, isComplete, isLoaded, nextStep, nextStepNumber, steps } = useChainProgress();
  const actor = nextStep ? demoAccounts.find((account) => account.id === nextStep.actorId) ?? null : null;
  const announcement = isComplete ? 'Demo chain complete.' : nextStep ? `Next, step ${nextStepNumber} of ${steps.length}: ${nextStep.actorName}, ${nextStep.title}.` : '';

  return (
    <aside aria-label="Demo steps" className="demo-rail">
      <div className="demo-rail__inner">
        {/* The rail reads three businesses' views at once, which no business can do, so it is labeled as a presenter tool. */}
        <Badge icon={<Icon name="monitor" />} tone="simulated">Presenter tool</Badge>

        <div className="demo-rail__body">
          {!isLoaded ? (
            <p className={failure ? 'demo-rail__status demo-rail__status--failed' : 'demo-rail__status'}>
              {failure ? `Couldn’t load the demo steps (${failure.message}).` : 'Loading demo steps…'}
            </p>
          ) : isComplete ? (
            <p className="demo-rail__status">
              <strong>Chain complete.</strong> <Link to="/demo">See the money views</Link>
            </p>
          ) : nextStep ? (
            <>
              <span className="demo-rail__count">Step {nextStepNumber} of {steps.length}</span>
              <span className="demo-rail__actor">
                {actor ? <AccountAvatar account={actor} size="sm" /> : null}
                {nextStep.actorName}
              </span>
              <span className="demo-rail__title">{nextStep.title}</span>
              <RailStepAction step={nextStep} />
            </>
          ) : null}
          {/* Loaded but a later poll failed: the step shown may be behind, so say so rather than look current. */}
          {isLoaded && failure ? (
            <span className="demo-rail__status demo-rail__status--failed">
              <Icon name="alert-circle" size={14} /> Not refreshing
            </span>
          ) : null}
        </div>

        <div className="demo-rail__end">
          <Link className="demo-rail__guide-link" to="/demo">Demo guide</Link>
          <button aria-label="Hide demo steps (show them again from the demo guide)" className="demo-rail__hide" onClick={onHide} type="button">
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>
      {/* Announces a new next step once, not the whole strip on every poll. */}
      <p aria-live="polite" className="ui-visually-hidden">{announcement}</p>
    </aside>
  );
}
