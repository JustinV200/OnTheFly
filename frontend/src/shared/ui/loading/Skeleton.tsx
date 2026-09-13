/* A grey placeholder block in the shape of content that hasn't loaded yet.
   Always aria-hidden: it must sit beside a role="status" label that names what is loading (see LoadingSpinner). */
import type { CSSProperties } from 'react';

import './Skeleton.css';

interface SkeletonProps {
  // Any CSS length; defaults fill the row at body-text height.
  width?: string;
  height?: string;
  shape?: 'line' | 'block' | 'pill';
}

/** Render one shimmering placeholder block. */
export function Skeleton({ width = '100%', height, shape = 'line' }: SkeletonProps): JSX.Element {
  const style: CSSProperties = { width, height };
  return <span aria-hidden="true" className={`ui-skeleton ui-skeleton--${shape}`} style={style} />;
}
