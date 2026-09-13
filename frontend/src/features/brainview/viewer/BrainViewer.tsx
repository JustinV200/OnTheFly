/* The simulated fly brain panel: compact card by default, a larger panel with activity and provenance when expanded.
   Loaded lazily by FlyBrainDock, so none of this code (or the worker) is fetched until a fly-brain result arrives. */
import { useCallback, useState } from 'react';

import { finishBrainRun, type QueuedBrainRun } from '../../../shared/flybrain/live';
import { Badge, Button, Callout, Icon, joinClassNames } from '../../../shared/ui';
import { DEFAULT_PLAYBACK_SPEED, type PlaybackSpeed } from '../playback/playbackClock';
import { TIME_STEP_MS } from '../simulation/model/lifParameters';
import { GroupActivity } from './activity/GroupActivity';
import { BrainCanvas } from './canvas/BrainCanvas';
import { PlaybackControls } from './controls/PlaybackControls';
import { RunProvenance } from './description/RunProvenance';
import { RunRole } from './description/RunRole';
import { describeInput, describeStatus } from './description/statusText';
import { useBrainSession } from './useBrainSession';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import './BrainViewer.css';

interface BrainViewerProps {
  run: QueuedBrainRun;
  waitingCount: number;
  isExpanded: boolean;
  // Hidden keeps the run playing behind the dock's chip; the panel just isn't shown.
  isHidden: boolean;
  onToggleExpanded: () => void;
  onHide: () => void;
  onClose: () => void;
}

/** Render the panel for one run; switching runs replaces the session but keeps the chosen speed. */
export function BrainViewer({ run, waitingCount, isExpanded, isHidden, onToggleExpanded, onHide, onClose }: BrainViewerProps): JSX.Element {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [speed, setSpeed] = useState<PlaybackSpeed>(DEFAULT_PLAYBACK_SPEED);
  // Reduced motion: a run waits for Play instead of flashing on its own.
  const { session, status, retry } = useBrainSession(run, speed, prefersReducedMotion);
  const [renderFailure, setRenderFailure] = useState<string | null>(null);
  const onRenderFailure = useCallback((reason: string) => setRenderFailure(reason), []);
  // Read on every render: the session's layout arrives with a worker message, which also changes the status.
  const layout = session.layout;
  const input = describeInput(status);

  return (
    <aside aria-label="Simulated fly brain" className={joinClassNames('brain-viewer', isExpanded && 'brain-viewer--expanded')} hidden={isHidden}>
      <header className="brain-viewer__header">
        <Badge icon={<Icon name="fly" />} tone="flybrain">
          Fly brain
        </Badge>
        <h2 className="brain-viewer__title">Simulated fly brain</h2>
        <div className="brain-viewer__actions">
          <button aria-label={isExpanded ? 'Show a smaller panel' : 'Show a larger panel'} className="brain-viewer__icon-button" onClick={onToggleExpanded} type="button">
            <Icon name={isExpanded ? 'minimize' : 'maximize'} size={18} />
          </button>
          <button aria-label="Hide the panel and keep the simulation running" className="brain-viewer__icon-button" onClick={onHide} type="button">
            <Icon name="chevron-down" size={18} />
          </button>
          <button aria-label="Close the fly brain view" className="brain-viewer__icon-button" onClick={onClose} type="button">
            <Icon name="x" size={18} />
          </button>
        </div>
      </header>

      <RunRole stimulus={run.stimulus} />

      {status.phase === 'failed' ? (
        <Callout
          actions={
            <Button onClick={retry} size="sm">
              Try again
            </Button>
          }
          role="alert"
          title="The brain simulation couldn’t run"
          tone="danger"
        >
          <p>{status.failure} Results elsewhere in the app are unaffected.</p>
        </Callout>
      ) : null}
      {renderFailure !== null ? (
        <Callout role="alert" title="The brain can’t be drawn here" tone="warning">
          <p>
            {renderFailure} The simulation still runs{isExpanded ? '; activity by cell class is below.' : '; open the larger panel to see activity by cell class.'}
          </p>
        </Callout>
      ) : null}

      {layout !== null && renderFailure === null ? (
        <BrainCanvas layout={layout} onRenderFailure={onRenderFailure} session={session} showsLabels={isExpanded} />
      ) : null}
      {layout === null && status.phase !== 'failed' ? <div aria-hidden="true" className="brain-viewer__placeholder" /> : null}

      <p className="brain-viewer__status">{describeStatus(status)}</p>
      {input !== null ? <p className="brain-viewer__input">{input}</p> : null}
      {prefersReducedMotion && status.phase === 'paused' && status.brainTimeMs === 0 ? (
        <p className="brain-viewer__note">Waiting for Play, because this device asks for reduced motion.</p>
      ) : null}

      <div className="brain-viewer__controls">
        <PlaybackControls
          onReplay={() => session.replay()}
          onSpeedChange={setSpeed}
          onTogglePause={() => session.togglePause()}
          showsSpeed={isExpanded}
          status={status}
        />
        {waitingCount > 0 ? (
          <Button iconEnd={<Icon name="chevron-right" />} onClick={() => finishBrainRun(run.id)} size="sm" variant="ghost">
            Next run ({waitingCount} waiting)
          </Button>
        ) : null}
      </div>

      {isExpanded && layout !== null ? (
        <div className="brain-viewer__details">
          <p className="brain-viewer__fired">
            {status.firedNeuronCount.toLocaleString()} of {layout.header.neuron_count.toLocaleString()} neurons have fired so far
          </p>
          <GroupActivity layout={layout} playbackStep={status.brainTimeMs / TIME_STEP_MS} timeline={session.runTimeline} />
          <RunProvenance layout={layout} stimulus={run.stimulus} />
        </div>
      ) : null}

      {/* Announces phase and input changes only; the ticking brain time would be noise to a screen reader. */}
      <p aria-live="polite" className="ui-visually-hidden">
        {status.phase === 'failed' ? 'The brain simulation couldn’t run.' : input ?? describeStatus(status)}
      </p>
    </aside>
  );
}
