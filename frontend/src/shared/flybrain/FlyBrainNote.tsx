/* Explains, in plain sentences, which fly-brain circuits produced a panel and what each did.
   Circuits that could not run are still listed by the backend, so this never overstates coverage. */
import { FlyBrainBadge } from './FlyBrainBadge';
import type { FlyBrainAttribution } from './types';

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
    <aside
      aria-label="How this was computed"
      style={{
        backgroundColor: '#fffbeb',
        border: '1px dashed #f59e0b',
        borderRadius: '8px',
        fontSize: '0.85rem',
        margin: '0.5rem 0',
        padding: '0.5rem 0.75rem',
      }}
    >
      <ul style={{ display: 'grid', gap: '0.35rem', listStyle: 'none', margin: 0, padding: 0 }}>
        {attributions.map((attribution) => (
          <li key={attribution.component} style={{ alignItems: 'baseline', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <FlyBrainBadge attribution={attribution} />
            <span>{attribution.role}</span>
          </li>
        ))}
      </ul>
      {isAllDeterministic ? (
        <p style={{ color: '#78350f', margin: '0.35rem 0 0' }}>
          Fruit-fly-inspired circuits: deterministic code, no AI model. Results are suggestions for you to review.
        </p>
      ) : null}
    </aside>
  );
}
