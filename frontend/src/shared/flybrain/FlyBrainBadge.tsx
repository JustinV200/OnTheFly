/* Marks a piece of UI as produced by a fly-brain circuit.
   Every fly-brain result on screen carries this badge, so the source is never ambiguous.
   It uses the brand tone, which no status label uses, so it never reads as a verdict (success, warning). */
import { Badge, Icon } from '../ui';
import type { FlyBrainAttribution } from './types';

interface FlyBrainBadgeProps {
  attribution: FlyBrainAttribution;
}

/** Render a compact, consistently styled "Fly brain · <component>" badge; hover shows its role. */
export function FlyBrainBadge({ attribution }: FlyBrainBadgeProps): JSX.Element {
  return (
    // The fly icon is decorative; the text carries the meaning for screen readers.
    <Badge icon={<Icon name="fly" />} title={attribution.role} tone="brand">
      Fly brain · {attribution.label}
    </Badge>
  );
}
