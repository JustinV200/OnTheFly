/* Explains, in plain sentences, which fly-brain circuits produced a panel and what each did.
   Circuits that could not run are still listed by the backend, so this never overstates coverage. */
import { FlyBrainBadge } from './FlyBrainBadge';
import type { FlyBrainAttribution } from './types';
import './FlyBrainNote.css';

interface FlyBrainNoteProps {
  attributions: FlyBrainAttribution[];
}

/** Render each attribution's badge beside its role, plus the no-AI-model disclosure. */
export function FlyBrainNote({ attributions }: FlyBrainNoteProps): JSX.Element | null {
  if (attributions.length === 0) {
    return null;
  }

  const isAllDeterministic = attributions.every((attribution) => attribution.is_deterministic);

  return (
    <aside aria-label="How this was computed" className="flybrain-note">
      <ul className="flybrain-note__list">
        {attributions.map((attribution) => (
          <li className="flybrain-note__item" key={attribution.component}>
            <FlyBrainBadge attribution={attribution} />
            <span className="flybrain-note__role">{attribution.role}</span>
          </li>
        ))}
      </ul>
      {isAllDeterministic ? (
        <p className="flybrain-note__disclosure">
          Fruit-fly-inspired circuits: deterministic code, no AI model. Results are suggestions for you to review.
        </p>
      ) : null}
    </aside>
  );
}
