/* One business's money view in the trio: only the task chain's tasks it can see, as that business sees them (owner figures
   for a task it owns, buyer figures for one it posted), and a muted count of any other tasks it has. */
import { demoAccounts } from '../../../../shared/account/demoAccounts';
import type { WorkResponse } from '../../../tasks/types';
import { ActorDot } from '../ActorDot';
import { MoneyFigure } from './MoneyFigure';
import { partitionWorkItems } from './partitionWorkItems';

interface MoneyColumnProps {
  accountId: string;
  response: WorkResponse | null;
  chainTaskIds: ReadonlySet<string>;
}

/** Render the column for one business. */
export function MoneyColumn({ accountId, response, chainTaskIds }: MoneyColumnProps): JSX.Element {
  const account = demoAccounts.find((candidate) => candidate.id === accountId);
  const work = partitionWorkItems(response, chainTaskIds);

  return (
    <section aria-label={`${account?.businessName ?? accountId}'s view`} className="demo-trio__column">
      <h3 className="demo-trio__name"><ActorDot color={account?.color ?? null} /> {account?.businessName ?? accountId}</h3>
      {work === null ? <p className="ui-text-muted ui-text-sm">Loading…</p> : null}
      {work !== null && work.chainItems.length === 0 ? <p className="ui-text-muted ui-text-sm">No chain tasks yet.</p> : null}
      {work?.chainItems.map((item) => (
        <div className="demo-trio__item" key={`${item.task_id}-${item.relationship}`}>
          <p className="demo-trio__title">{item.title ?? 'Task'} <span className="ui-text-xs ui-text-muted">({item.owner_money ? 'you own it' : 'you posted it'})</span></p>
          {item.owner_money ? (
            <dl className="demo-trio__figures">
              <MoneyFigure item={item} label="Starting price" minor={item.owner_money.starting_price_minor} />
              <MoneyFigure item={item} label="Pieces commit" minor={item.owner_money.committed_minor} />
              <MoneyFigure item={item} label="Remainder" minor={item.owner_money.remainder_minor} />
              <MoneyFigure item={item} label="Potential margin" minor={item.owner_money.potential_margin_minor} />
            </dl>
          ) : item.buyer_money ? (
            <dl className="demo-trio__figures">
              <MoneyFigure item={item} label={item.buyer_money.baseline_label} minor={item.buyer_money.baseline_minor} />
              <MoneyFigure item={item} label={item.state === 'accepted' ? 'Accepted' : 'Listed'} minor={item.buyer_money.task_amount_minor} />
              <MoneyFigure item={item} label={item.buyer_money.difference_label} minor={item.state === 'accepted' ? item.buyer_money.potential_difference_minor : null} />
            </dl>
          ) : null}
        </div>
      ))}
      {work !== null && work.otherTaskCount > 0 ? (
        <p className="demo-trio__other">+{work.otherTaskCount} other {work.otherTaskCount === 1 ? 'task' : 'tasks'} not in this chain</p>
      ) : null}
    </section>
  );
}
