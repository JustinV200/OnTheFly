/* The money view of a task its viewer posted (roadmap 12, step 10): the baseline, what was accepted or is still listed,
   the poster's own pieces, and the potential difference under the origin's own words ("Potential savings" for a rebid,
   "under budget" for new work, "under your cut" for a piece). Nothing beyond the accepted bidder is ever shown here. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import { Badge, Card, Grid, Stack, Stat } from '../../../shared/ui';
import type { BuyerMoneyView } from '../types';
import { MoneyBar, MoneyBarSegment } from './MoneyBar';

interface BuyerMoneyProps {
  money: BuyerMoneyView;
}

/** Render the poster's stats and, when it split pieces off itself, how its baseline divides. */
export function BuyerMoney({ money }: BuyerMoneyProps): JSX.Element {
  const unit = cadenceSuffix(money.billing_period);
  const amount = (minor: number): JSX.Element => <MoneyDisplay amountMinor={minor} currency={money.currency} />;
  const isAccepted = money.task_status === 'accepted';
  const difference = money.potential_difference_minor;

  const segments: MoneyBarSegment[] = [
    ...money.own_pieces.map((piece) => ({
      key: piece.task_id,
      label: `${piece.title ?? 'Your piece'} (${piece.accepted_price_minor === null ? 'cut, no offer accepted yet' : 'accepted price'})`,
      amountMinor: piece.committed_minor,
      tone: piece.accepted_price_minor === null ? ('pending' as const) : ('piece' as const),
    })),
    ...(money.task_amount_minor !== null
      ? [{ key: 'task', label: isAccepted ? 'This task, accepted' : 'This task, listed', amountMinor: money.task_amount_minor, tone: isAccepted ? ('piece' as const) : ('pending' as const) }]
      : []),
  ];

  return (
    <Card actions={<Badge tone="private">Only you see this</Badge>} title="What you pay for this task">
      <Stack gap={5}>
        <Grid minItemWidth="11rem">
          <Stat label={money.baseline_label} size="lg" unit={money.baseline_minor === null ? undefined : unit} value={money.baseline_minor === null ? <span className="ui-text-muted">No budget stated</span> : amount(money.baseline_minor)} />
          <Stat
            caption={isAccepted ? `Accepted from ${money.accepted_bidder?.business_name ?? 'the bidder'}` : 'Still listed; nothing accepted yet'}
            label={isAccepted ? 'Accepted price' : 'Listed price'}
            size="lg"
            unit={money.task_amount_minor === null ? undefined : unit}
            value={money.task_amount_minor === null ? <span className="ui-text-muted">No price</span> : amount(money.task_amount_minor)}
          />
          <Stat
            caption={money.is_fully_accepted ? 'Potential until the work actually changes hands' : 'Pending: not everything is accepted yet'}
            label={money.difference_label}
            size="lg"
            tone={difference !== null && difference > 0 && money.is_fully_accepted ? 'success' : 'default'}
            unit={difference === null ? undefined : unit}
            value={difference === null ? <span className="ui-text-muted">Not computed</span> : amount(difference)}
          />
        </Grid>
        {money.own_pieces.length > 0 && money.baseline_minor !== null ? (
          <MoneyBar currency={money.currency} label="How your baseline divides" segments={segments} totalMinor={money.baseline_minor} />
        ) : null}
      </Stack>
    </Card>
  );
}
