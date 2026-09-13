/* The three businesses' money views side by side, each column fetched with that business's own identity. None of them
   sees the other columns: GovCon's never names Sub B, Sub B's never names GovCon. The "matches" lines compare columns for
   the audience, which is exactly what no single business can do in the product. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { demoAccounts } from '../../shared/account/demoAccounts';
import { cadenceSuffix } from '../../shared/market';
import { Badge, Card, Icon } from '../../shared/ui';
import type { WorkItem, WorkResponse } from '../tasks/types';
import { ActorDot } from './ActorDot';
import { GOVCON_ID, PRIME_A_ID, SUB_B_ID } from './chainSteps';

interface MoneyTrioProps {
  govcon: WorkResponse | null;
  prime: WorkResponse | null;
  sub: WorkResponse | null;
}

/** Render the three columns and the reconciliation checks. */
export function MoneyTrio({ govcon, prime, sub }: MoneyTrioProps): JSX.Element {
  const rebid = govcon?.posted.find((item) => item.origin === 'rebid' && item.category === 'devsecops') ?? null;
  const primeTask = rebid ? prime?.owned.find((item) => item.task_id === rebid.task_id) ?? null : null;
  const piece = prime?.posted.find((item) => item.origin === 'split') ?? null;
  const subTask = piece ? sub?.owned.find((item) => item.task_id === piece.task_id) ?? null : null;

  const checks = [
    {
      label: 'GovCon’s accepted price = Prime A’s starting price',
      isOk: rebid?.buyer_money?.task_amount_minor != null && rebid.buyer_money.task_amount_minor === primeTask?.owner_money?.starting_price_minor,
    },
    {
      label: 'Prime A’s accepted piece price = Sub B’s starting price',
      isOk: piece?.buyer_money?.task_amount_minor != null && piece.state === 'accepted' && piece.buyer_money.task_amount_minor === subTask?.owner_money?.starting_price_minor,
    },
    {
      label: 'Prime A’s remainder = starting price − what its pieces commit',
      isOk: primeTask?.owner_money != null && primeTask.owner_money.remainder_minor === primeTask.owner_money.starting_price_minor - primeTask.owner_money.committed_minor,
    },
  ];

  return (
    <Card description="Each column is fetched as that business, exactly as it would see it. Checks compare columns for the audience only." title="Money views, side by side">
      <div className="demo-trio">
        <Column accountId={GOVCON_ID} items={govcon ? [...govcon.owned, ...govcon.posted] : null} />
        <Column accountId={PRIME_A_ID} items={prime ? [...prime.owned, ...prime.posted] : null} />
        <Column accountId={SUB_B_ID} items={sub ? [...sub.owned, ...sub.posted] : null} />
      </div>
      <ul className="demo-trio__checks">
        {checks.map((check) => (
          <li key={check.label}>
            <Badge icon={<Icon name={check.isOk ? 'check' : 'clock'} />} tone={check.isOk ? 'success' : 'neutral'}>{check.isOk ? 'Reconciles' : 'Not yet'}</Badge> {check.label}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Column({ accountId, items }: { accountId: string; items: WorkItem[] | null }): JSX.Element {
  const account = demoAccounts.find((candidate) => candidate.id === accountId);
  const unique = items ? items.filter((item, index) => items.findIndex((other) => other.task_id === item.task_id && other.relationship === item.relationship) === index) : null;
  return (
    <section aria-label={`${account?.businessName ?? accountId}'s view`} className="demo-trio__column">
      <h3 className="demo-trio__name"><ActorDot color={account?.color ?? null} /> {account?.businessName ?? accountId}</h3>
      {unique === null ? <p className="ui-text-muted ui-text-sm">Loading…</p> : null}
      {unique !== null && unique.length === 0 ? <p className="ui-text-muted ui-text-sm">No tasks yet.</p> : null}
      {unique?.map((item) => (
        <div className="demo-trio__item" key={`${item.task_id}-${item.relationship}`}>
          <p className="demo-trio__title">{item.title ?? 'Task'} <span className="ui-text-xs ui-text-muted">({item.owner_money ? 'you own it' : 'you posted it'})</span></p>
          {item.owner_money ? (
            <dl className="demo-trio__figures">
              <Figure label="Starting price" minor={item.owner_money.starting_price_minor} item={item} />
              <Figure label="Pieces commit" minor={item.owner_money.committed_minor} item={item} />
              <Figure label="Remainder" minor={item.owner_money.remainder_minor} item={item} />
              <Figure label="Potential margin" minor={item.owner_money.potential_margin_minor} item={item} />
            </dl>
          ) : item.buyer_money ? (
            <dl className="demo-trio__figures">
              <Figure label={item.buyer_money.baseline_label} minor={item.buyer_money.baseline_minor} item={item} />
              <Figure label={item.state === 'accepted' ? 'Accepted' : 'Listed'} minor={item.buyer_money.task_amount_minor} item={item} />
              <Figure label={item.buyer_money.difference_label} minor={item.state === 'accepted' ? item.buyer_money.potential_difference_minor : null} item={item} />
            </dl>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function Figure({ label, minor, item }: { label: string; minor: number | null; item: WorkItem }): JSX.Element {
  return (
    <div className="demo-trio__figure">
      <dt>{label}</dt>
      <dd>{minor === null ? <span className="ui-text-muted">—</span> : <><MoneyDisplay amountMinor={minor} currency={item.currency} /> {cadenceSuffix(item.billing_period)}</>}</dd>
    </div>
  );
}
