/* Spend's "Data sources" card: once something is imported, one visible summary line (each source's name, provenance and
   counts, and the last import) with the source rows (the Hackathon demo ledger and the Stripe sandbox, their imports and
   details) behind "Manage data sources". Layout only: it owns no data or requests. The summary line stays outside the
   disclosure, because provenance and the ledger's name are honesty labels (shared/ui Disclosure never holds one). */
import { ReactNode, useRef } from 'react';

import { Card, Disclosure, Stack } from '../../../shared/ui';
import './dataSources.css';

interface DataSourcesCardProps {
  // The visible one-line summary, or null before anything is imported.
  summary: ReactNode | null;
  // The totals sentence (exclusions, posted dates), first inside the disclosure; null before anything is imported.
  totals: string | null;
  // True when the rows must be in view: nothing imported yet (the import is the page's next step), the status failed,
  // or an import just ran (its outcome notice is inside).
  shouldOpen: boolean;
  // One DataSourceSection per source; they stack with hairline dividers.
  children: ReactNode;
}

/** Render the card with its summary line and the collapsible source rows. */
export function DataSourcesCard({ summary, totals, shouldOpen, children }: DataSourcesCardProps): JSX.Element {
  // Latched: once the rows had to open they stay open, so a notice inside never disappears behind a collapse on the next
  // render. The Disclosure's <details> only re-syncs when this value changes, so an owner's own toggle is kept.
  const hasOpenedRef = useRef(false);
  if (shouldOpen) {
    hasOpenedRef.current = true;
  }

  return (
    <Card description={summary ? undefined : 'Where the figures on this page come from.'} title="Data sources">
      <Stack gap={3}>
        {summary ? <div className="data-sources__summary">{summary}</div> : null}
        {/* One tree whether or not anything is imported: switching shape would remount the Stripe row mid-import. */}
        <Disclosure className="data-sources__manage" isDefaultOpen={hasOpenedRef.current} summary="Manage data sources">
          {totals ? <p className="data-sources__totals">{totals}</p> : null}
          <div className="data-sources">{children}</div>
        </Disclosure>
      </Stack>
    </Card>
  );
}
