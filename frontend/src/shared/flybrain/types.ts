/* Declares the fly-brain attribution every fly-brain API response carries.
   Shared because the dashboard and marketplace both label fly-brain output with it. */
// whole_brain_simulation is the browser's own simulated brain (features/brainview): the one result read off simulated
// spikes rather than computed by the backend, the fruit fly's opinion on an offer. It is labelled a toy wherever shown.
export type FlyBrainComponent = 'compound_eye' | 'mushroom_body_novelty' | 'mushroom_body_flyhash' | 'whole_brain_simulation';

export interface FlyBrainAttribution {
  component: FlyBrainComponent;
  label: string;
  role: string;
  is_deterministic: boolean;
}
