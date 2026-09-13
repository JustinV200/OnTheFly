/* The responsive grid market cards sit in, shared by the board, its loading placeholders and similar listings, so every
   list of markets in this feature lines up the same way. */
import type { ReactNode } from 'react';

import { joinClassNames } from '../../../shared/ui';
import './MarketGrid.css';

interface MarketGridProps {
  // "compact" fits more, narrower cards, for a secondary row such as similar listings.
  density?: 'comfortable' | 'compact';
  className?: string;
  children: ReactNode;
}

/** Render children as a card grid: one column on a phone, up to four on a wide desktop. */
export function MarketGrid({ density = 'comfortable', className, children }: MarketGridProps): JSX.Element {
  return <div className={joinClassNames('market-grid', `market-grid--${density}`, className)}>{children}</div>;
}
