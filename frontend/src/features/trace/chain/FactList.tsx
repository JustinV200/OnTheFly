/* A step's plain facts as label and value pairs, in as many columns as fit. Values are shown exactly as the step words them. */
import type { ReactNode } from 'react';

import './FactList.css';

export interface Fact {
  label: string;
  value: ReactNode;
}

/** Render facts as a description list; pass only the facts that apply, since an absent row says nothing either way. */
export function FactList({ facts }: { facts: Fact[] }): JSX.Element {
  return (
    <dl className="trace-facts">
      {facts.map((fact) => (
        <div className="trace-facts__item" key={fact.label}>
          <dt className="trace-facts__label">{fact.label}</dt>
          <dd className="trace-facts__value">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
