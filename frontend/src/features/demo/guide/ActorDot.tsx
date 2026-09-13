/* A small dot in a demo business's own colour, beside its name, so the audience can follow who acts. Decorative. The
   colour is the business's identity data from demoAccounts.ts, passed through a custom property, never a literal here. */
import type { CSSProperties } from 'react';

import './ActorDot.css';

/** Render the colour dot; null renders a neutral one. */
export function ActorDot({ color }: { color: string | null }): JSX.Element {
  const style = (color ? { '--actor-color': color } : {}) as CSSProperties;
  return <span aria-hidden="true" className="demo-actor-dot" style={style} />;
}
