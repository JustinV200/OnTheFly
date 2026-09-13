/* One source row inside the Data sources card: name with provenance and status badges, one short line of facts, and
   its own action at the row's end on a tablet and up. The longer explanation waits behind "Details"; notices (children)
   always run full width below, so a failure or timeout is never hidden.
   Without a title it is a bare divided slot, for states that bring their own heading (loading, a failure, an empty state). */
import { ReactNode, useId } from 'react';

import { Cluster, Disclosure } from '../../../shared/ui';
import './dataSources.css';

interface DataSourceSectionProps {
  title?: string;
  // Provenance and connection-state badges, read before the actions.
  meta?: ReactNode;
  // One short line: counts and when it last imported.
  facts?: ReactNode;
  actions?: ReactNode;
  // Account ids and how the source works, behind a "Details" disclosure.
  details?: ReactNode;
  // Progress, results, failures, and detail lists, below the row.
  children?: ReactNode;
}

/** Render one divided source row; its h3 sits under the card's h2. */
export function DataSourceSection({ title, meta, facts, actions, details, children }: DataSourceSectionProps): JSX.Element {
  const titleId = useId();

  if (!title) {
    return <div className="data-source data-source--bare">{children}</div>;
  }

  return (
    <section aria-labelledby={titleId} className="data-source">
      <div className="data-source__row">
        <div className="data-source__main">
          <Cluster gap={2}>
            <h3 className="data-source__title" id={titleId}>{title}</h3>
            {meta}
          </Cluster>
          {facts ? <p className="data-source__facts">{facts}</p> : null}
        </div>
        {actions ? <Cluster className="data-source__actions" gap={2}>{actions}</Cluster> : null}
      </div>
      {details ? (
        <Disclosure className="data-source__disclosure" summary="Details">
          {details}
        </Disclosure>
      ) : null}
      {/* Spaced with margins, not a gap: an idle live region stays in the DOM empty and must not add space. */}
      {children ? <div className="data-source__details">{children}</div> : null}
    </section>
  );
}
