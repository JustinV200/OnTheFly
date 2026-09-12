/* Marks a piece of UI as produced by a fly-brain circuit.
   Every fly-brain result on screen carries this badge, so the source is never ambiguous. */
import type { FlyBrainAttribution } from './types';

interface FlyBrainBadgeProps {
  attribution: FlyBrainAttribution;
}

/** Render a compact, consistently styled "Fly brain · <component>" pill; hover shows its role. */
export function FlyBrainBadge({ attribution }: FlyBrainBadgeProps): JSX.Element {
  return (
    <span
      title={attribution.role}
      style={{
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '999px',
        color: '#78350f',
        display: 'inline-flex',
        fontSize: '0.75rem',
        fontWeight: 600,
        gap: '0.3rem',
        padding: '0.1rem 0.55rem',
        whiteSpace: 'nowrap',
      }}
    >
      {/* The emoji is decorative; the text carries the meaning for screen readers. */}
      <span aria-hidden="true">🪰</span>
      Fly brain · {attribution.label}
    </span>
  );
}
