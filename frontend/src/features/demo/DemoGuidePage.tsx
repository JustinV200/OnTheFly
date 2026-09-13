/* The presenter's demo guide for the task chain (plan2, "Demo"): jump to any point, follow the script with one-click "act as"
   buttons, and watch the three money views reconcile. It is a presenter tool, labeled as one: it shows three businesses'
   own views together, which no business can see in the product. Every column is still fetched as that business. */
import { Badge, Callout, Icon, PageHeader, Stack } from '../../shared/ui';
import type { WorkResponse } from '../tasks/types';
import { chainSteps, GOVCON_ID, PRIME_A_ID, SUB_B_ID } from './chainSteps';
import { MoneyTrio } from './MoneyTrio';
import { StageControls } from './StageControls';
import { StepList } from './StepList';
import { usePolledAs } from './usePolledAs';
import './DemoGuidePage.css';

const POLL_INTERVAL_MS = 4000;

/** Render the demo guide. */
export function DemoGuidePage(): JSX.Element {
  const govcon = usePolledAs<WorkResponse>('/api/work', GOVCON_ID, POLL_INTERVAL_MS);
  const prime = usePolledAs<WorkResponse>('/api/work', PRIME_A_ID, POLL_INTERVAL_MS);
  const sub = usePolledAs<WorkResponse>('/api/work', SUB_B_ID, POLL_INTERVAL_MS);
  const steps = chainSteps({ govcon: govcon.data, prime: prime.data, sub: sub.data });
  const doneCount = steps.filter((step) => step.isDone).length;
  const failure = govcon.error ?? prime.error ?? sub.error;

  const reloadAll = (): void => {
    govcon.reload();
    prime.reload();
    sub.reload();
  };

  return (
    <Stack gap={6}>
      <PageHeader
        meta={(
          <>
            <Badge icon={<Icon name="monitor" />} size="md" tone="simulated">Presenter tool</Badge>
            <Badge size="md" tone="neutral">{doneCount} of {steps.length} steps done</Badge>
          </>
        )}
        subtitle="GovCon Industries posts a REBID, Prime A wins it and splits off a piece where it saves money, Sub B wins the piece and can split again. Every business, rate, supplier and offer here is demo data."
        title="Demo guide: the task chain"
      />
      {failure ? (
        <Callout role="alert" title="Couldn’t load a business’s view" tone="danger"><p>{failure.message}</p></Callout>
      ) : null}
      <StageControls onStaged={reloadAll} />
      <div className="demo-guide__columns">
        <StepList steps={steps} />
        <MoneyTrio govcon={govcon.data} prime={prime.data} sub={sub.data} />
      </div>
    </Stack>
  );
}
