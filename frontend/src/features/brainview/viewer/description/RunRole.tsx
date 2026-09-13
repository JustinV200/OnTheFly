/* One sentence saying how the brain view relates to a result: beside it without changing it for the analysis circuits,
   or the very run that produced it for the fruit fly's opinion, which is read off these spikes. */
import { CIRCUIT_LABELS, type BrainStimulus } from '../../../../shared/flybrain/live';
import './RunDescription.css';

interface RunRoleProps {
  stimulus: BrainStimulus;
}

/** One sentence naming the result this run accompanies and where that result actually came from. */
export function RunRole({ stimulus }: RunRoleProps): JSX.Element {
  if (stimulus.circuits.includes('whole_brain_simulation')) {
    // Same stimulus, same seed, so these are the spikes the opinion counted (features/brainview/opinion).
    return (
      <p className="run-description__role">
        This is the run behind <strong>{stimulus.result_label}</strong>: the same input and seed, replayed. Its spike counts are
        that opinion, and nothing else in the app reads them.
      </p>
    );
  }
  const circuits = stimulus.circuits.map((circuit) => CIRCUIT_LABELS[circuit]).join(' and ');
  return (
    <p className="run-description__role">
      Runs alongside <strong>{stimulus.result_label}</strong>. It doesn’t change any result: {stimulus.result_label} came from{' '}
      {circuits || 'the fly-brain circuits'}, before this started.
    </p>
  );
}
