/* A dense data table inside its own scroll container, so a wide table scrolls by itself and the page never does.
   layout="stack" turns each row into a labelled card below 640px; cells then need data-label="<column name>".
   Numeric cells take className="ui-num" and right-align; the caller writes <thead>/<tbody> as usual. */
import type { CSSProperties, ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames';
import './Table.css';

interface TableProps {
  // Accessible name for the scroll region and the table, e.g. "Your expenses".
  label: string;
  // Visible caption above the table, when the surrounding heading doesn't already name it.
  caption?: ReactNode;
  // Width below which the table scrolls horizontally instead of squeezing (ignored by the phone stack layout).
  minWidth?: string;
  layout?: 'scroll' | 'stack';
  // Rows highlight on hover; pair with an onClick on <tr> and a real button or link inside the row for keyboard users.
  isInteractive?: boolean;
  density?: 'compact' | 'comfortable';
  className?: string;
  children: ReactNode;
}

/** Render a styled table wrapped in a focusable, horizontally scrollable region. */
export function Table({ label, caption, minWidth, layout = 'scroll', isInteractive = false, density = 'comfortable', className, children }: TableProps): JSX.Element {
  // A custom property rather than an inline min-width, so the phone stack layout can override it from CSS.
  const style = (minWidth ? { '--ui-table-min-width': minWidth } : {}) as CSSProperties;
  return (
    // tabIndex lets keyboard users scroll a table that overflows; the region label says what they're in.
    <div aria-label={label} className={joinClassNames('ui-table-scroll', `ui-table-scroll--${layout}`)} role="region" tabIndex={0}>
      <table
        aria-label={caption ? undefined : label}
        className={joinClassNames('ui-table', `ui-table--${layout}`, `ui-table--${density}`, isInteractive && 'ui-table--interactive', className)}
        style={style}
      >
        {caption ? <caption className="ui-table__caption">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
