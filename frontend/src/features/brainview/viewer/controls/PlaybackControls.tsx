/* Pause, replay and playback speed for the simulated brain. Speed only changes how fast brain time is shown on screen;
   the simulation itself always runs Shiu et al.'s 0.1 ms steps. */
import { Button, Icon, SegmentedControl, type SegmentedOption } from '../../../../shared/ui';
import type { PlaybackSpeed } from '../../playback/playbackClock';
import type { PlaybackStatus } from '../../playback/playbackStatus';
import './PlaybackControls.css';

type SpeedValue = '0.05' | '0.1' | '0.25' | '1';

const SPEED_OPTIONS: SegmentedOption<SpeedValue>[] = [
  { value: '0.05', label: '1/20×' },
  { value: '0.1', label: '1/10×' },
  { value: '0.25', label: '1/4×' },
  { value: '1', label: 'Real time' },
];

interface PlaybackControlsProps {
  status: PlaybackStatus;
  onTogglePause: () => void;
  onReplay: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  // The compact dock shows pause and replay only.
  showsSpeed: boolean;
}

/** Render the controls; they are disabled until the run has started. */
export function PlaybackControls({ status, onTogglePause, onReplay, onSpeedChange, showsSpeed }: PlaybackControlsProps): JSX.Element {
  const hasStarted = status.phase !== 'loading' && status.phase !== 'starting' && status.phase !== 'failed';
  const isPaused = status.phase === 'paused';
  const isFinished = status.phase === 'finished';

  return (
    <div className="playback-controls">
      {isFinished ? (
        <Button iconStart={<Icon name="replay" />} onClick={onReplay} size="sm" variant="secondary">
          Replay
        </Button>
      ) : (
        <Button disabled={!hasStarted} iconStart={<Icon name={isPaused ? 'play' : 'pause'} />} onClick={onTogglePause} size="sm" variant="secondary">
          {isPaused ? 'Play' : 'Pause'}
        </Button>
      )}
      {!isFinished ? (
        <Button disabled={!hasStarted} iconStart={<Icon name="replay" />} onClick={onReplay} size="sm" variant="ghost">
          Restart
        </Button>
      ) : null}
      {showsSpeed ? (
        <SegmentedControl<SpeedValue>
          label="Playback speed"
          onChange={(value) => onSpeedChange(Number(value) as PlaybackSpeed)}
          options={SPEED_OPTIONS}
          size="sm"
          value={String(status.speed) as SpeedValue}
        />
      ) : null}
    </div>
  );
}
