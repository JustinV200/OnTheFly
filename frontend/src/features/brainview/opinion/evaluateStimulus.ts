/* Runs a stimulus through the shared simulation worker and resolves with its per-trial totals.
   Results are cached by stimulus fingerprint for the visit, so polling pages and re-opened drawers never re-simulate
   the same offer, and the seed comes from that same fingerprint, so "Watch it think" replays the very same spikes. */
import { type BrainStimulus, brainStimulusKey } from '../../../shared/flybrain/live';
import { brainWorkerClient } from '../playback/brainWorkerClient';
import { stimulusSeed } from '../playback/stimulusSeed';
import type { StimulusEvaluation } from '../simulation/evaluation/trialActivity';

const evaluations = new Map<string, Promise<StimulusEvaluation>>();
let evaluationCounter = 0;

/** Evaluate a stimulus once per visit; a failed evaluation is forgotten so the caller can try again. */
export function evaluateBrainStimulus(stimulus: BrainStimulus): Promise<StimulusEvaluation> {
  const key = brainStimulusKey(stimulus);
  const cached = evaluations.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const evaluation = new Promise<StimulusEvaluation>((resolve, reject) => {
    const client = brainWorkerClient();
    evaluationCounter += 1;
    const evaluationId = `evaluation-${evaluationCounter}`;
    const unsubscribe = client.subscribe((message) => {
      if (message.type === 'evaluated' && message.evaluationId === evaluationId) {
        unsubscribe();
        resolve(message.evaluation);
      } else if (message.type === 'failed' && (message.runId === evaluationId || message.runId === null)) {
        // A null runId is the brain data itself failing, which no evaluation can survive.
        unsubscribe();
        reject(new Error(message.message));
      }
    });
    client.evaluate(evaluationId, stimulus, stimulusSeed(key));
  });
  evaluations.set(key, evaluation);
  evaluation.catch(() => evaluations.delete(key));
  return evaluation;
}
