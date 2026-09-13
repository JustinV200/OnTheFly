/* A small rounded label for a state or origin: visibility, bidding mode, provenance, scope gaps.
   Tones are named by meaning, not colour, and the text always states the meaning, so colour is never the only signal. */
import type { ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames';
import './Badge.css';

// neutral: plain facts. info: open/public-facing terms. success: a positive, confirmed state. warning: needs attention.
// danger: failed or unlabeled. simulated: demo data. private: owner-only. brand: fly-brain analysis output.
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'simulated' | 'private' | 'brand';

interface BadgeProps {
  tone?: BadgeTone;
  // Decorative leading icon (e.g. <Icon name="lock" size={12} />); the text must still carry the meaning.
  icon?: ReactNode;
  size?: 'sm' | 'md';
  // Longer explanation on hover, for labels that compress a rule into a word or two.
  title?: string;
  className?: string;
  children: ReactNode;
}

/** Render an inline badge. */
export function Badge({ tone = 'neutral', icon, size = 'sm', title, className, children }: BadgeProps): JSX.Element {
  return (
    <span className={joinClassNames('ui-badge', `ui-badge--${tone}`, `ui-badge--${size}`, className)} title={title}>
      {icon ? <span className="ui-badge__icon">{icon}</span> : null}
      <span className="ui-badge__text">{children}</span>
    </span>
  );
}
