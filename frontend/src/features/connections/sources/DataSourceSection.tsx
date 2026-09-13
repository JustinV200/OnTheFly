/* One source inside the Data sources card: title with origin and status badges, a short description, and its actions
   at the row's end on a tablet and up. Notices and lists (children) run full width below.
   Without a title it is a bare divided slot, for states that bring their own heading (loading, a failure, an empty state). */
import { ReactNode, useId } from 'react';

import { Cluster, Stack } from '../../../shared/ui';
import './dataSources.css';

interface DataSourceSectionProps {
  title?: string;
  // Provenance and connection-state badges, read before the actions.
  meta?: ReactNode;
  // One or two short paragraphs saying what the source holds.
  description?: ReactNode;
  actions?: ReactNode;
  // Progress, results, and detail lists, below the row.
  children?: ReactNode;
}

/** Render one divided source section; its h3 sits under the card's h2. */
export function DataSourceSection({ title, meta, description, actions, children }: DataSourceSectionProps): JSX.Element {
  const titleId = useId();

  if (!title) {
    return <div className="data-source data-source--bare">{children}</div>;
  }

  return (
    <section aria-labelledby={titleId} className="data-source">
      <div className="data-source__row">
        <Stack gap={2}>
          <Cluster gap={2}>
            <h3 className="data-source__title" id={titleId}>{title}</h3>
            {meta}
          </Cluster>
          {description ? <div className="data-source__description">{description}</div> : null}
        </Stack>
        {actions ? <Cluster gap={2}>{actions}</Cluster> : null}
      </div>
      {/* Spaced with margins, not a gap: an idle live region stays in the DOM empty and must not add space. */}
      {children ? <div className="data-source__details">{children}</div> : null}
    </section>
  );
}
