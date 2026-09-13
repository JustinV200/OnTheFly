/* One labelled figure in a money column, in the task's currency and billing period. It highlights briefly when a poll
   changes it; the highlight is a colour fade, which the global reduced-motion rule turns into an instant change. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../../shared/market';
import type { WorkItem } from '../../../tasks/types';
import { useChangeFlash } from './useChangeFlash';

interface MoneyFigureProps {
  label: string;
  // Null renders a dash: the figure doesn't exist yet (e.g. no accepted price).
  minor: number | null;
  item: WorkItem;
}

/** Render a term and its amount. */
export function MoneyFigure({ label, minor, item }: MoneyFigureProps): JSX.Element {
  const isChanged = useChangeFlash(minor);
  return (
    <div className={`demo-trio__figure${isChanged ? ' demo-trio__figure--changed' : ''}`}>
      <dt>{label}</dt>
      <dd>{minor === null ? <span className="ui-text-muted">—</span> : <><MoneyDisplay amountMinor={minor} currency={item.currency} /> {cadenceSuffix(item.billing_period)}</>}</dd>
    </div>
  );
}
