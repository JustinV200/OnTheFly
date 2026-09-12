/* One numbered link in the trace chain, connected to the next by a visible "comes from" arrow. */
import type { ReactNode } from 'react';

interface TraceStepProps {
  step: number;
  title: ReactNode;
  // What the next step down explains about this one; omitted on the last step.
  leadsTo?: string;
  children: ReactNode;
}

/** Render one step card and, when there is a next step, the arrow pointing down to it. */
export function TraceStep({ step, title, leadsTo, children }: TraceStepProps): JSX.Element {
  return (
    <>
      <section id={`trace-step-${step}`} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.9rem 1rem' }}>
        <h3 style={{ margin: '0 0 0.4rem' }}>
          <span style={{ backgroundColor: '#0f172a', borderRadius: '999px', color: '#ffffff', display: 'inline-block', fontSize: '0.85rem', marginRight: '0.5rem', padding: '0 0.55rem' }}>
            {step}
          </span>
          {title}
        </h3>
        {children}
      </section>
      {leadsTo ? (
        <p style={{ color: '#475569', margin: '0.35rem 0 0.35rem 1.25rem' }}>
          ↓ <a href={`#trace-step-${step + 1}`}>{leadsTo}</a>
        </p>
      ) : null}
    </>
  );
}
