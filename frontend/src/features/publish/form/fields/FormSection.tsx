/* One titled group inside the scope form ("What you buy", "Where", "What you pay", "Bidding"): a heading, a sentence of
   context, then its controls. Deliberately unnamed, so it isn't a landmark: the step card is the region. */
import type { ReactNode } from 'react';

import './FormSection.css';

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** Render a form section with an h3 title (the step card holds the h2). */
export function FormSection({ title, description, children }: FormSectionProps): JSX.Element {
  return (
    <section className="publish-form-section">
      <div className="publish-form-section__header">
        <h3 className="publish-form-section__title">{title}</h3>
        {description ? <div className="publish-form-section__description">{description}</div> : null}
      </div>
      {children}
    </section>
  );
}
