/* A horizontal row that wraps: badges beside a title, a group of actions, figure plus provenance.
   Wrapping is on by default so a row never forces horizontal scroll at phone width. */
import type { CSSProperties, ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames';
import { SpaceStep, spaceVar } from './spaceStep';
import './layout.css';

interface ClusterProps {
  gap?: SpaceStep;
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
  isNoWrap?: boolean;
  as?: 'div' | 'span' | 'ul' | 'nav' | 'header' | 'footer';
  className?: string;
  children: ReactNode;
}

const JUSTIFY: Record<NonNullable<ClusterProps['justify']>, CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
};

/** Render children in a wrapping row with a consistent gap. */
export function Cluster({ gap = 2, align = 'center', justify = 'start', isNoWrap = false, as: Element = 'div', className, children }: ClusterProps): JSX.Element {
  const style: CSSProperties = {
    alignItems: align === 'start' || align === 'end' ? `flex-${align}` : align,
    flexWrap: isNoWrap ? 'nowrap' : 'wrap',
    gap: spaceVar(gap),
    justifyContent: JUSTIFY[justify],
  };
  return (
    <Element className={joinClassNames('ui-cluster', className)} style={style}>
      {children}
    </Element>
  );
}
