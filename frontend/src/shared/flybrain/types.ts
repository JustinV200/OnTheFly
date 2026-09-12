/* Declares the fly-brain attribution every fly-brain API response carries.
   Shared because the dashboard and marketplace both label fly-brain output with it. */
export type FlyBrainComponent = 'compound_eye' | 'mushroom_body_novelty' | 'mushroom_body_flyhash';

export interface FlyBrainAttribution {
  component: FlyBrainComponent;
  label: string;
  role: string;
  is_deterministic: boolean;
}
