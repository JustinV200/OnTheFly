/* Presenter controls: jump the GovCon task chain to any point of the story. Each button names the step it lands on, and
   the one matching the live progress is marked "Current". Staging rebuilds the chain from scratch and replays every
   earlier step through the real services (same guards, demo-data offers), so it needs a second click to confirm. */
import { useState } from 'react';

import { ApiError, post } from '../../../../shared/api/client';
import { useApiQuery } from '../../../../shared/api/useApiQuery';
import { Badge, Button, Callout, Card, Cluster, Stack } from '../../../../shared/ui';
import type { ChainStep } from '../../progress/chainSteps';
import { currentStageName, describeStage, STAGES } from './stageCatalog';
import { StageMessage, stageMessageStore } from './stageMessageStore';

interface StageControlsProps {
  steps: ChainStep[];
  // Until progress loads, every step reads "not done", which would wrongly mark the start as current.
  isProgressLoaded: boolean;
  onStaged: () => void;
}

/** Render the stage buttons with a confirm step. */
export function StageControls({ steps, isProgressLoaded, onStaged }: StageControlsProps): JSX.Element {
  const controls = useApiQuery<{ is_enabled: boolean; stages: string[] }>('/api/demo/task-chain');
  const [pending, setPending] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessageState] = useState<StageMessage | null>(stageMessageStore.read);
  const currentStage = isProgressLoaded ? currentStageName(steps) : null;
  const describe = (name: string): string => describeStage(name, steps.length);

  const setMessage = (next: StageMessage | null): void => {
    stageMessageStore.write(next);
    setMessageState(next);
  };

  const stage = async (name: string): Promise<void> => {
    setIsWorking(true);
    setMessage(null);
    try {
      await post('/api/demo/task-chain/stage', { stage: name });
      const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
      setMessage({ tone: 'success', title: `Staged: ${describe(name)}`, detail: `Rebuilt at ${time}. The steps and money views update within a few seconds.` });
      onStaged();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setMessage({ tone: 'danger', title: `Couldn’t stage ${describe(name)}`, detail: caught.message });
    } finally {
      setIsWorking(false);
      setPending(null);
    }
  };

  if (controls.data && !controls.data.is_enabled) {
    return <Callout role="note" title="Demo controls are off" tone="neutral"><p>DEMO_CONTROLS_ENABLED is false on this server.</p></Callout>;
  }

  return (
    <Card actions={<Badge tone="simulated">Rebuilds the GovCon chain</Badge>} description="Every step before the one you pick is replayed through the real services, with demo-data offers." title="Jump to a point in the story">
      <Stack gap={3}>
        <Cluster gap={2}>
          {(controls.data?.stages ?? STAGES.map((entry) => entry.name)).map((name) => {
            const isCurrent = name === currentStage;
            return (
              <Button aria-current={isCurrent ? 'step' : undefined} key={name} onClick={() => setPending(name)} size="sm" variant={pending === name ? 'primary' : 'secondary'}>
                {describe(name)}
                {isCurrent ? <> <Badge tone="brand">Current</Badge></> : null}
              </Button>
            );
          })}
        </Cluster>
        {pending ? (
          <Callout
            actions={(
              <>
                <Button isBusy={isWorking} onClick={() => void stage(pending)} size="sm" variant="primary">{isWorking ? 'Rebuilding…' : 'Rebuild from scratch'}</Button>
                <Button onClick={() => setPending(null)} size="sm" variant="ghost">Cancel</Button>
              </>
            )}
            role="alert"
            title={`Rebuild the GovCon chain from scratch at “${describe(pending)}”?`}
            tone="warning"
          >
            <p>
              This deletes every task GovCon Industries, Prime A and Sub B posted or own, with their listings, offers and splits, and
              returns GovCon’s expenses to private. It then replays each step up to this point with demo-data offers. Other
              businesses’ data is untouched, and it refuses to run if a genuine offer is on these listings.
            </p>
          </Callout>
        ) : null}
        {message ? (
          <Callout role="status" title={message.title} tone={message.tone}>
            <p>{message.detail}</p>
          </Callout>
        ) : null}
      </Stack>
    </Card>
  );
}
