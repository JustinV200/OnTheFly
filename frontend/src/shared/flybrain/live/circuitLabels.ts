/* Display names for fly-brain circuits, for surfaces that receive only a component key (the brain view's stimulus).
   Mirrors COMPONENT_LABELS in backend app/services/flybrain/attribution.py; change both together. */
import type { FlyBrainComponent } from '../types';

export const CIRCUIT_LABELS: Record<FlyBrainComponent, string> = {
  compound_eye: 'Compound Eye',
  mushroom_body_novelty: 'Mushroom Body · novelty filter',
  mushroom_body_flyhash: 'Mushroom Body · FlyHash',
  whole_brain_simulation: 'Whole-brain simulation',
};
