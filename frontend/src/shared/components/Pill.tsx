/* Renders a small rounded label in one of a fixed set of tones.
   Tones carry meaning app-wide (e.g. "simulated" is always amber), so they're named by meaning, not colour.
   Pill predates the design system and keeps its API for existing call sites; it renders the system's Badge. */
import type { ReactNode } from 'react';

import { Badge, BadgeTone } from '../ui';

// Badge's tones minus the accent tint and the fly-brain tone, which only FlyBrainBadge uses.
export type PillTone = Exclude<BadgeTone, 'brand' | 'flybrain'>;

interface PillProps {
  tone: PillTone;
  children: ReactNode;
  // Longer explanation on hover, for labels that compress a rule into a word or two.
  title?: string;
}

/** Render an inline pill label. */
export function Pill({ tone, children, title }: PillProps): JSX.Element {
  return (
    <Badge title={title} tone={tone}>
      {children}
    </Badge>
  );
}
