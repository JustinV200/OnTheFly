/* The owner-facing fly-brain badge on Spend: still violet, still the fly, still the words "Fly brain", so fly-brain output
   is never mistaken for a verdict, but it says what happened in plain words ("Found by name matching") instead of a
   circuit name (roadmap 11, step 9). The circuit name and role live in FlyBrainDisclosure. */
import type { FlyBrainAttribution, FlyBrainComponent } from '../../../shared/flybrain/types';
import { Badge, Icon } from '../../../shared/ui';

// What each circuit did, in the owner's words. An unrecognized component falls back to its own label, never to nothing.
const PLAIN_WORDS: Record<FlyBrainComponent, string> = {
  compound_eye: 'Found by price-pattern matching',
  mushroom_body_flyhash: 'Found by name matching',
  mushroom_body_novelty: 'Found by charge-pattern matching',
};

interface PlainFlyBrainBadgeProps {
  attribution: FlyBrainAttribution;
}

/** Render "Fly brain · Found by …" with the circuit's role on hover. */
export function PlainFlyBrainBadge({ attribution }: PlainFlyBrainBadgeProps): JSX.Element {
  return (
    <Badge icon={<Icon name="fly" />} title={`${attribution.label}: ${attribution.role}`} tone="flybrain">
      Fly brain · {PLAIN_WORDS[attribution.component] ?? attribution.label}
    </Badge>
  );
}
