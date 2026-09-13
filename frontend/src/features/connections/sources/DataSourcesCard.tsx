/* Groups the dashboard's financial source panels (the connection summary and the Stripe sandbox controls) into one
   "Data sources" card, so where the figures come from reads as a single area. Layout only: it owns no data or requests. */
import type { ReactNode } from 'react';

import { Card } from '../../../shared/ui';
import './dataSources.css';

interface DataSourcesCardProps {
  // One DataSourceSection per source; they stack with hairline dividers.
  children: ReactNode;
}

/** Render the "Data sources" card around its source sections. */
export function DataSourcesCard({ children }: DataSourcesCardProps): JSX.Element {
  return (
    <Card description="Where the figures on this dashboard come from. Importing never publishes anything." title="Data sources">
      <div className="data-sources">{children}</div>
    </Card>
  );
}
