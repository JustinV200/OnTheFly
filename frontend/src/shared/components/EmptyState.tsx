/* Renders an intentional empty state: what is missing, why that's normal, and what to do next.
   A blank area reads as broken; a sentence reads as a product that knows this happens. */
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** Render a bordered empty-state card with an optional explanation and action. */
export function EmptyState({ title, children, action }: EmptyStateProps): JSX.Element {
  return (
    <section
      style={{
        backgroundColor: '#f8fafc',
        border: '1px dashed #94a3b8',
        borderRadius: '12px',
        margin: '1rem 0',
        padding: '1.25rem',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem' }}>{title}</h3>
      {children ? <div style={{ color: '#334155' }}>{children}</div> : null}
      {action ? <div style={{ marginTop: '0.75rem' }}>{action}</div> : null}
    </section>
  );
}
