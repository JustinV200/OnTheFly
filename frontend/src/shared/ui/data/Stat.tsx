/* A labelled figure: the money or count a screen is about, big and in tabular numerals, with its unit and provenance.
   The caption slot is where a ProvenanceBadge or "potential" qualifier goes; a figure without one is incomplete. */
import type { ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames';
import './Stat.css';

interface StatProps {
  label: ReactNode;
  // Usually a <MoneyDisplay>; any number renders with tabular numerals.
  value: ReactNode;
  // Trailing unit in smaller type, e.g. "/ month" or "/ yr".
  unit?: ReactNode;
  // Provenance badge, assumptions, or a "provisional" note under the figure.
  caption?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  // success/danger only when the sign is the meaning (a potential saving vs. a higher price); words must say it too.
  tone?: 'default' | 'success' | 'danger';
  className?: string;
}

/** Render one metric as a description list: label, value with unit, caption. */
export function Stat({ label, value, unit, caption, size = 'lg', tone = 'default', className }: StatProps): JSX.Element {
  return (
    <dl className={joinClassNames('ui-stat', `ui-stat--${size}`, `ui-stat--${tone}`, className)}>
      <dt className="ui-stat__label">{label}</dt>
      <dd className="ui-stat__value">
        <span className="ui-stat__figure">{value}</span>
        {unit ? <span className="ui-stat__unit">{unit}</span> : null}
      </dd>
      {caption ? <dd className="ui-stat__caption">{caption}</dd> : null}
    </dl>
  );
}
