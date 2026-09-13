/* "The fruit fly says…": a speech bubble beside an offer with the simulated fly brain's yes or no and a 1–5 rating.
   The answer is read off spikes from the whole-brain simulation (see useFlyOpinion); the bubble says so in plain words,
   is styled in the fly-brain violet rather than any status colour, and never gates or performs acceptance. */
import { type BrainStimulus, publishBrainStimulus } from '../../../shared/flybrain/live';
import { Button, Disclosure, Icon, Spinner } from '../../../shared/ui';
import { RATING_STEPS } from './flyOpinion';
import { RatingDots } from './RatingDots';
import { useFlyOpinion } from './useFlyOpinion';
import './FlyOpinionBubble.css';

interface FlyOpinionBubbleProps {
  // The offer's two-trial stimulus from the inbox row; null when the server had nothing to compare it against.
  stimulus: BrainStimulus | null;
  bidderName: string;
}

/** Render the fruit fly's opinion on one offer, or the reason there isn't one. */
export function FlyOpinionBubble({ stimulus, bidderName }: FlyOpinionBubbleProps): JSX.Element {
  const { state, retry } = useFlyOpinion(stimulus);

  return (
    <aside aria-label={`The fruit fly's opinion on ${bidderName}'s offer`} className="fly-opinion">
      <span aria-hidden="true" className="fly-opinion__fly">
        <Icon name="fly" size={22} />
      </span>
      <div className="fly-opinion__bubble">
        <p className="fly-opinion__eyebrow">The fruit fly says…</p>
        {state.status === 'none' ? (
          <p className="fly-opinion__line">Nothing. There is no current price to compare this offer against.</p>
        ) : null}
        {state.status === 'thinking' ? (
          <p className="fly-opinion__line" role="status">
            <Spinner size="sm" />{' '}
            {state.loadPercent === null ? 'Sniffing this offer…' : `Waking up: downloading the brain wiring, ${state.loadPercent}% (first time this visit)`}
          </p>
        ) : null}
        {state.status === 'failed' ? (
          <p className="fly-opinion__line" role="alert">
            It couldn’t look: {state.message}{' '}
            <Button onClick={retry} size="sm" variant="ghost">Try again</Button>
          </p>
        ) : null}
        {state.status === 'ready' && state.opinion === null ? (
          <p className="fly-opinion__line">Nothing. Neither smell made a single neuron fire.</p>
        ) : null}
        {state.status === 'ready' && state.opinion !== null ? (
          <>
            <p className="fly-opinion__answer">
              <strong className="fly-opinion__word">{state.opinion.answer === 'yes' ? 'Yes' : 'No'}</strong>
              <RatingDots rating={state.opinion.rating} />
            </p>
            <p className="fly-opinion__line">
              {state.opinion.answer === 'yes'
                ? `This offer stirred up fewer of its simulated neurons than what you pay now (${state.opinion.offerSpikes.toLocaleString()} spikes against ${state.opinion.nowSpikes.toLocaleString()}).`
                : `This offer stirred up at least as many of its simulated neurons as what you pay now (${state.opinion.offerSpikes.toLocaleString()} spikes against ${state.opinion.nowSpikes.toLocaleString()}).`}
            </p>
            <Disclosure summary="How the fly decided">
              <p>
                It was given two smells, one after the other, from rest: what you pay now, then this offer. The offer smells fainter
                the cheaper it is per month, stronger the dearer, with an extra whiff for every requirement it leaves out or doesn’t
                mention. Each smell was played through a simulation of a whole fruit fly brain, and the spikes were counted.
              </p>
              <p>
                Yes means the offer’s smell caused fewer spikes; a tie is a no. The rating steps up as the two counts drift apart:
                {' '}{RATING_STEPS.map((step) => `${Math.round(step * 100)}%`).join(', ')} and beyond.
              </p>
              <Button
                iconStart={<Icon name="fly" />}
                onClick={() => publishBrainStimulus(stimulus)}
                size="sm"
                variant="secondary"
              >
                Watch it think
              </Button>
            </Disclosure>
          </>
        ) : null}
        <p className="fly-opinion__label">Simulated fly brain · a toy, not advice. You decide.</p>
      </div>
    </aside>
  );
}
