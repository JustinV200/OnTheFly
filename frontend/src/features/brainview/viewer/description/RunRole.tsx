/* One sentence saying the brain view runs beside a result without changing it, and which circuits made that result. */
import { CIRCUIT_LABELS, type BrainStimulus } from '../../../../shared/flybrain/live';
import './RunDescription.css';

interface RunRoleProps {
  stimulus: BrainStimulus;
}

/** One sentence naming the result this run accompanies and the circuits that actually produced it. */
export function RunRole({ stimulus }: RunRoleProps): JSX.Element {
  const circuits = stimulus.circuits.map((circuit) => CIRCUIT_LABELS[circuit]).join(' and ');
  return (
    <p className="run-description__role">
      Runs alongside <strong>{stimulus.result_label}</strong>. It doesn’t change any result: {stimulus.result_label} came from{' '}
      {circuits || 'the fly-brain circuits'}, before this started.
    </p>
  );
}
