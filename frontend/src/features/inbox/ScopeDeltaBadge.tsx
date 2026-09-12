/* Renders one scope-delta chip for a missing, unstated, or added offer element. */
import { Pill } from '../../shared/components/Pill';
import { scopeItemLabel } from '../../shared/format/scopeItemLabel';

interface ScopeDeltaBadgeProps {
  kind: 'missing' | 'unstated' | 'added';
  item: string;
}

const KIND_STYLES = {
  missing: { prefix: 'Missing', tone: 'danger' },
  unstated: { prefix: 'Not stated', tone: 'warning' },
  added: { prefix: 'Added', tone: 'info' },
} as const;

/** Render a small badge describing one scope delta item. */
export function ScopeDeltaBadge({ kind, item }: ScopeDeltaBadgeProps): JSX.Element {
  const style = KIND_STYLES[kind];
  return <Pill tone={style.tone}>{style.prefix}: {scopeItemLabel(item)}</Pill>;
}
