/* Presenter controls: jump the GovCon task chain to any point of the story. Staging resets that chain and replays every
   earlier step through the real services (same guards, demo-data offers), so it needs a second click to confirm. */
import { useState } from 'react';

import { ApiError, post } from '../../shared/api/client';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { Badge, Button, Callout, Card, Cluster, Stack } from '../../shared/ui';

interface StageControlsProps {
  onStaged: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  start: 'Start: ledger, rates, one new task',
  rebid_published: 'GovCon’s REBID is public',
  prime_offer: 'Prime A has bid',
  prime_owns: 'Prime A owns the task',
  piece_published: 'Piece is public',
  sub_offer: 'Sub B has bid',
  sub_owns: 'Sub B owns the piece',
};

/** Render the stage buttons with a confirm step. */
export function StageControls({ onStaged }: StageControlsProps): JSX.Element {
  const controls = useApiQuery<{ is_enabled: boolean; stages: string[] }>('/api/demo/task-chain');
  const [pending, setPending] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const stage = async (name: string): Promise<void> => {
    setIsWorking(true);
    setMessage(null);
    try {
      await post('/api/demo/task-chain/stage', { stage: name });
      setMessage({ tone: 'success', text: `Staged: ${STAGE_LABELS[name] ?? name}.` });
      onStaged();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setMessage({ tone: 'danger', text: caught.message });
    } finally {
      setIsWorking(false);
      setPending(null);
    }
  };

  if (controls.data && !controls.data.is_enabled) {
    return <Callout role="note" title="Demo controls are off" tone="neutral"><p>DEMO_CONTROLS_ENABLED is false on this server.</p></Callout>;
  }

  return (
    <Card actions={<Badge tone="simulated">Resets the GovCon chain</Badge>} description="Every step before the one you pick is replayed through the real services, with demo-data offers." title="Jump to a point in the story">
      <Stack gap={3}>
        <Cluster gap={2}>
          {(controls.data?.stages ?? Object.keys(STAGE_LABELS)).map((name) => (
            <Button key={name} onClick={() => setPending(name)} size="sm" variant={pending === name ? 'primary' : 'secondary'}>
              {STAGE_LABELS[name] ?? name}
            </Button>
          ))}
        </Cluster>
        {pending ? (
          <Callout
            actions={(
              <>
                <Button isBusy={isWorking} onClick={() => void stage(pending)} size="sm" variant="primary">{isWorking ? 'Staging…' : 'Reset and stage'}</Button>
                <Button onClick={() => setPending(null)} size="sm" variant="ghost">Cancel</Button>
              </>
            )}
            role="alert"
            title={`Stage “${STAGE_LABELS[pending] ?? pending}”?`}
            tone="warning"
          >
            <p>This deletes the GovCon, Prime A and Sub B task chain and rebuilds it. Other businesses’ data is untouched.</p>
          </Callout>
        ) : null}
        {message ? <Callout role="status" title={message.text} tone={message.tone} /> : null}
      </Stack>
    </Card>
  );
}
