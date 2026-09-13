/* Turns the two trial totals of an opinion stimulus into the fruit fly's answer and rating. Deterministic code over
   simulated spike counts: the fly says yes when the offer stirred up fewer spikes than what the owner pays now, and
   the rating is how far apart the two counts were. It is a toy reading of a simulation, never advice or a check. */
import type { StimulusEvaluation } from '../simulation/evaluation/trialActivity';

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

// The relative spike difference at which the rating steps up: under 5% is 1, then 2 from 5%, 3 from 15%, 4 from 30%,
// 5 from 50%. Shown on the bubble, so a reader can see how a rating was reached.
export const RATING_STEPS: readonly number[] = [0.05, 0.15, 0.3, 0.5];

/** Read the opinion off an evaluation; null when the run wasn't the two-trial shape or nothing fired in either trial. */
export function deriveFlyOpinion(evaluation: StimulusEvaluation): FlyOpinion | null {
  if (evaluation.trials.length !== 2) {
    return null;
  }
  // The backend fixes the order: the first trial is what the owner pays now, the second the offer.
  const [now, offer] = evaluation.trials;
  const largest = Math.max(now.spikeCount, offer.spikeCount);
  if (largest === 0) {
    return null;
  }
  const differenceFraction = (now.spikeCount - offer.spikeCount) / largest;
  return {
    // An exact tie leans no: the fly wasn't moved either way, and "take it" needs a reason.
    answer: differenceFraction > 0 ? 'yes' : 'no',
    rating: ratingFor(Math.abs(differenceFraction)),
    nowSpikes: now.spikeCount,
    offerSpikes: offer.spikeCount,
    differenceFraction,
  };
}

function ratingFor(magnitude: number): FlyRating {
  const stepsPassed = RATING_STEPS.filter((step) => magnitude >= step).length;
  return (stepsPassed + 1) as FlyRating;
}
