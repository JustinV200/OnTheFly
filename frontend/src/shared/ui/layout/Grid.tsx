/* A responsive grid that fits as many columns as the minimum item width allows, down to one on a phone.
   Used for form fields, stat rows, and card lists, so no screen needs its own media queries for these. */
import type { CSSProperties, ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames';
import { SpaceStep, spaceVar } from './spaceStep';
import './layout.css';

interface GridProps {
  // Narrowest a column may get before the grid drops a column, as any CSS length.
  minItemWidth?: string;
  gap?: SpaceStep;
  as?: 'div' | 'ul' | 'ol' | 'section' | 'dl';
  className?: string;
  children: ReactNode;
}

/** Render children in an auto-fitting responsive grid. */
export function Grid({ minItemWidth = '220px', gap = 4, as: Element = 'div', className, children }: GridProps): JSX.Element {
  // A custom property, so the CSS can cap the minimum at 100% and never overflow a narrow container.
  const style = { '--ui-grid-min': minItemWidth, gap: spaceVar(gap) } as CSSProperties;
  return (
    <Element className={joinClassNames('ui-grid', className)} style={style}>
      {children}
    </Element>
  );
}
