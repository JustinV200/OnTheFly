/* The presenter's demo guide for the task chain (plan2, "Demo"): jump to any point, follow the script with one-click "act as"
   buttons, rehearse in three tiled windows, and watch the three money views reconcile. It is a presenter tool, labeled as
   one: it shows three businesses' own views together, which no business can see in the product. Every column is still
   fetched as that business. The demo steps rail is not shown here, so this page's polling is the only polling. */
import { useRef } from 'react';

import { Badge, Callout, Icon, PageHeader, Stack } from '../../shared/ui';
import { ChainCompleteCallout } from './guide/ChainCompleteCallout';
import { MoneyTrio } from './guide/money/MoneyTrio';
import { RehearseLinks } from './guide/RehearseLinks';
import { StageControls } from './guide/stages/StageControls';
import { StepList } from './guide/StepList';
import { useChainProgress } from './progress/useChainProgress';
import { ShowRailButton } from './rail/ShowRailButton';
import { useRailHidden } from './rail/useRailHidden';
import './DemoGuidePage.css';

/** Render the demo guide. */
export function DemoGuidePage(): JSX.Element {
  const progress = useChainProgress();
  const [isRailHidden] = useRailHidden();
  const moneyViewsRef = useRef<HTMLDivElement>(null);

  const showMoneyViews = (): void => {
    const target = moneyViewsRef.current;
    if (target === null) {
      return;
    }
    // Smooth scrolling is motion; a reduced-motion device jumps straight there.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  };

  return (
    <Stack gap={6}>
      <PageHeader
        actions={isRailHidden ? <ShowRailButton /> : undefined}
        meta={(
          <>
            <Badge icon={<Icon name="monitor" />} size="md" tone="simulated">Presenter tool</Badge>
            <Badge size="md" tone="neutral">{progress.doneCount} of {progress.steps.length} steps done</Badge>
          </>
        )}
        subtitle="GovCon Industries posts a REBID, Prime A wins it and splits off a piece where it saves money, Sub B wins the piece and can split again. Every business, rate, supplier and offer here is demo data."
        title="Demo guide: the task chain"
      />
      {progress.isComplete ? <ChainCompleteCallout onShowMoneyViews={showMoneyViews} stepCount={progress.steps.length} /> : null}
      {progress.failure ? (
        <Callout role="alert" title="Couldn’t load a business’s view" tone="danger"><p>{progress.failure.message}</p></Callout>
      ) : null}
      <RehearseLinks />
      <StageControls isProgressLoaded={progress.isLoaded} onStaged={progress.reload} steps={progress.steps} />
      <div className="demo-guide__columns">
        <StepList steps={progress.steps} />
        {/* tabIndex -1: "See the money views" moves focus here without adding a tab stop. */}
        <div className="demo-guide__money" ref={moneyViewsRef} tabIndex={-1}>
          <MoneyTrio views={progress.views} />
        </div>
      </div>
    </Stack>
  );
}
