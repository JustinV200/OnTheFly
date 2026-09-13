/* Vertical rhythm: children in a column with one token gap between them, instead of per-element margins. */
import type { CSSProperties, ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames';
import { SpaceStep, spaceVar } from './spaceStep';
import './layout.css';

interface StackProps {
  gap?: SpaceStep;
  // Cross-axis alignment; "stretch" (the default) makes children full width.
  align?: 'start' | 'center' | 'end' | 'stretch';
  as?: 'div' | 'section' | 'article' | 'ul' | 'ol' | 'header' | 'footer';
  className?: string;
  children: ReactNode;
}

/** Render children stacked vertically with a consistent gap. */
export function Stack({ gap = 4, align = 'stretch', as: Element = 'div', className, children }: StackProps): JSX.Element {
  const style: CSSProperties = { alignItems: align === 'stretch' ? 'stretch' : `flex-${align}`, gap: spaceVar(gap) };
  return (
    <Element className={joinClassNames('ui-stack', className)} style={style}>
      {children}
    </Element>
  );
}
