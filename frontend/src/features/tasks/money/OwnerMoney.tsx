/* The money view of a task its viewer won (roadmap 12, step 10): the accepted offer it is paid, what its pieces commit,
   the remainder, and, where its own rates cover every retained requirement, keep cost and potential margin. Every
   figure is the server's; "potential" stays on margin because nothing has changed hands. Labels and captions use the
   same words as Ways to save, each term explained by a TermHint. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatMoneyText } from '../../../shared/format/formatMoneyText';
import { cadenceSuffix } from '../../../shared/market';
import { Badge, Card, Grid, Stack, Stat, TermHint } from '../../../shared/ui';
import { MONEY_TERM_HINTS } from '../../savings/glossary/moneyTerms';
import type { OwnerMoneyView } from '../types';
import { MoneyBar, MoneyBarSegment } from './MoneyBar';

interface OwnerMoneyProps {
  money: OwnerMoneyView;
}

/** Render the owner's stats, the division of its starting price, and any keep-cost gaps. */
export function OwnerMoney({ money }: OwnerMoneyProps): JSX.Element {
  const unit = cadenceSuffix(money.billing_period);
  const amount = (minor: number): JSX.Element => <MoneyDisplay amountMinor={minor} currency={money.currency} />;
  const pieceCount = money.pieces.length;
  const segments: MoneyBarSegment[] = [
    ...money.pieces.map((piece) => ({
      key: piece.task_id,
      label: `${piece.title ?? 'Piece'} (${piece.accepted_price_minor === null ? 'cut, no offer accepted yet' : 'accepted price'})`,
      amountMinor: piece.committed_minor,
      tone: piece.accepted_price_minor === null ? ('pending' as const) : ('piece' as const),
    })),
    { key: 'remainder', label: 'Your remainder', amountMinor: money.remainder_minor, tone: 'remainder' },
  ];

  return (
    <Card actions={<Badge tone="private">Only you see this</Badge>} title="Your money on this task">
      <Stack gap={5}>
        <Grid minItemWidth="11rem">
          <Stat
            caption={money.client ? `Your offer, accepted by ${money.client.business_name}` : 'Your accepted offer'}
            label="Starting price"
            size="lg"
            unit={unit}
            value={amount(money.starting_price_minor)}
          />
          <Stat
            caption={pieceCount === 0 ? 'No pieces split off yet' : `${pieceCount} piece${pieceCount === 1 ? '' : 's'}: accepted price, or cut until accepted`}
            label={<TermHint hint={MONEY_TERM_HINTS.committed}>Committed to pieces</TermHint>}
            size="lg"
            unit={unit}
            value={amount(money.committed_minor)}
          />
          <Stat
            caption="Starting price − committed to pieces"
            label={<TermHint hint={MONEY_TERM_HINTS.remainder}>Remainder</TermHint>}
            size="lg"
            unit={unit}
            value={amount(money.remainder_minor)}
          />
          <Stat
            caption={money.keep_cost_minor === null
              ? 'Needs your rates and hours for every requirement you still do'
              : `Remainder − keep cost (${formatMoneyText(money.keep_cost_minor, money.currency)}, at your rates)`}
            label={<TermHint hint={MONEY_TERM_HINTS.potentialMargin}>Potential margin</TermHint>}
            size="lg"
            tone={money.potential_margin_minor !== null && money.potential_margin_minor < 0 ? 'danger' : 'default'}
            unit={money.potential_margin_minor === null ? undefined : unit}
            value={money.potential_margin_minor === null ? <span className="ui-text-muted">Not computed</span> : amount(money.potential_margin_minor)}
          />
        </Grid>
        <MoneyBar currency={money.currency} label="How your starting price divides" segments={segments} totalMinor={money.starting_price_minor} />
        {money.keep_cost_gaps.length > 0 ? (
          <p className="ui-text-sm ui-text-muted">
            <TermHint hint={MONEY_TERM_HINTS.keepCost}>Keep cost</TermHint> isn’t computed until these are filled in: {money.keep_cost_gaps.join('; ')}.
          </p>
        ) : null}
      </Stack>
    </Card>
  );
}
