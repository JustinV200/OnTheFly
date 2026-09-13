/* Turns the two trials of an opinion stimulus into the fruit fly's answer and rating. Deterministic code over
   simulated spike counts: the fly says yes when the offer stirred up fewer spikes than what the owner pays now, and
   the rating is how far apart the two counts were. It is a toy reading of a simulation, never advice or a check. */
import { TRIAL_BIN_MS, type StimulusEvaluation, type TrialActivity } from '../simulation/evaluation/trialActivity';

export type FlyAnswer = 'yes' | 'no';
export type FlyRating = 1 | 2 | 3 | 4 | 5;

export interface FlyOpinion {
  answer: FlyAnswer;
  rating: FlyRating;
  nowSpikes: number;
  offerSpikes: number;
  // (now − offer) / the larger of the two: positive when the offer was the fainter smell.
  differenceFraction: number;
}

// Only the first sniff is counted. Measured on the release 783 model (2026-09-13): within about 30 ms of an odour
// starting, activity runs away to a plateau of roughly 4,900 spikes per 10 ms that is the same whatever the smell, and
// it keeps going after the input stops. The first 20 ms still scale with the input (554 against 490 spikes for an
// offer at 92% of the baseline), so that window is the fly's reaction; anything longer would dilute it to a coin flip.
export const OPINION_WINDOW_MS = 20;
const OPINION_WINDOW_BINS = OPINION_WINDOW_MS / TRIAL_BIN_MS;

// The relative spike difference at which the rating steps up: under 5% is 1, then 2 from 5%, 3 from 15%, 4 from 30%,
// 5 from 50%. Shown on the bubble, so a reader can see how a rating was reached.
export const RATING_STEPS: readonly number[] = [0.05, 0.15, 0.3, 0.5];

/** Read the opinion off an evaluation; null when the run wasn't the two-trial shape or nothing fired in either window. */
export function deriveFlyOpinion(evaluation: StimulusEvaluation): FlyOpinion | null {
  if (evaluation.trials.length !== 2) {
    return null;
  }
  // The backend fixes the order: the first trial is what the owner pays now, the second the offer.
  const [now, offer] = evaluation.trials;
  const nowSpikes = firstSniffSpikes(now);
  const offerSpikes = firstSniffSpikes(offer);
  const largest = Math.max(nowSpikes, offerSpikes);
  if (largest === 0) {
    return null;
  }
  const differenceFraction = (nowSpikes - offerSpikes) / largest;
  return {
    // An exact tie leans no: the fly wasn't moved either way, and "take it" needs a reason.
    answer: differenceFraction > 0 ? 'yes' : 'no',
    rating: ratingFor(Math.abs(differenceFraction)),
    nowSpikes,
    offerSpikes,
    differenceFraction,
  };
}

function firstSniffSpikes(trial: TrialActivity): number {
  return trial.spikesPerBin.slice(0, OPINION_WINDOW_BINS).reduce((sum, count) => sum + count, 0);
}

function ratingFor(magnitude: number): FlyRating {
  const stepsPassed = RATING_STEPS.filter((step) => magnitude >= step).length;
  return (stepsPassed + 1) as FlyRating;
}
