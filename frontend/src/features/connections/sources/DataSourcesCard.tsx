/* Groups Spend's financial sources (the Hackathon demo ledger and the Stripe sandbox) into one "Data sources" card with
   a row per source, so where the figures come from reads as a single area. Layout only: it owns no data or requests.
   A plain card rather than a collapsed one: each row is one line, and a collapsed card would hide import failures. */
import type { ReactNode } from 'react';

import { Card } from '../../../shared/ui';

interface DataSourcesCardProps {
  // One sentence of totals across every source (counts, exclusions, dates), or null before anything is imported.
  summary: string | null;
  // One DataSourceSection per source; they stack with hairline dividers.
  children: ReactNode;
}

/** Render the "Data sources" card around its source rows. */
export function DataSourcesCard({ summary, children }: DataSourcesCardProps): JSX.Element {
  return (
    <Card
      description={<p>{summary ?? 'Where the figures on this page come from.'} Importing never publishes anything.</p>}
      title="Data sources"
    >
      <div className="data-sources">{children}</div>
    </Card>
  );
}
