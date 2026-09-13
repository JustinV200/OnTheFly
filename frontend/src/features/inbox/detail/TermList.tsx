/* A compact definition list for the drawer: label on the left, value on the right, a hairline between rows.
   Callers pass "Not stated" explicitly for unknown terms, since an unanswered term is different from a missing row. */
import type { ReactNode } from 'react';

export interface Term {
  label: string;
  value: ReactNode;
}

/** Render label and value rows. */
export function TermList({ terms }: { terms: Term[] }): JSX.Element {
  return (
    <dl className="offer-drawer__terms">
      {terms.map((term) => (
        <div className="offer-drawer__term" key={term.label}>
          <dt>{term.label}</dt>
          <dd>{term.value}</dd>
        </div>
      ))}
    </dl>
  );
}
