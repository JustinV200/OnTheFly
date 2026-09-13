/* The top of every page: the page's single h1, an optional eyebrow and subtitle, status badges, and page actions.
   Status that must be seen before acting (visibility, bidding mode, provenance) goes in `meta`, right under the title. */
import type { ReactNode } from 'react';

import './PageHeader.css';

interface PageHeaderProps {
  title: ReactNode;
  // Small context line above the title, e.g. "Listing" or a back link.
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  // Badges such as VisibilityBadge, BiddingModePill, ProvenanceBadge.
  meta?: ReactNode;
  // Page-level buttons; the primary one goes last so it sits at the end on desktop.
  actions?: ReactNode;
}

/** Render the page header with its h1. Use exactly one per page. */
export function PageHeader({ title, eyebrow, subtitle, meta, actions }: PageHeaderProps): JSX.Element {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__main">
        {eyebrow ? <div className="ui-page-header__eyebrow">{eyebrow}</div> : null}
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle ? <div className="ui-page-header__subtitle">{subtitle}</div> : null}
        {meta ? <div className="ui-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}
