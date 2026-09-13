/* The three businesses' money views side by side, each column fetched with that business's own identity. None of them
   sees the other columns: GovCon's never names Sub B, Sub B's never names GovCon. Columns show only the task chain's
   tasks. The "matches" lines compare columns for the audience, which is exactly what no single business can do. */
import { Badge, Card, Icon } from '../../../../shared/ui';
import { ChainViews, findChainTasks, GOVCON_ID, PRIME_A_ID, SUB_B_ID } from '../../progress/chainTasks';
import { MoneyColumn } from './MoneyColumn';
import './MoneyTrio.css';

interface MoneyTrioProps {
  views: ChainViews;
}

/** Render the three columns and the reconciliation checks. */
export function MoneyTrio({ views }: MoneyTrioProps): JSX.Element {
  const { rebid, primeTask, piece, subTask, taskIds } = findChainTasks(views);

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
        <MoneyColumn accountId={GOVCON_ID} chainTaskIds={taskIds} response={views.govcon} />
        <MoneyColumn accountId={PRIME_A_ID} chainTaskIds={taskIds} response={views.prime} />
        <MoneyColumn accountId={SUB_B_ID} chainTaskIds={taskIds} response={views.sub} />
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
