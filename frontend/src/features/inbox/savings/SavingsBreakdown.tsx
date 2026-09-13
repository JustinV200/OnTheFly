/* The drawer's full account of one offer's potential savings: the server's label and figures, why it is provisional
   (each assumption in plain words), and the baseline it is measured against. Every amount is the server's. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { Badge, Grid, Stat } from '../../../shared/ui';
import type { InboxChallenge } from '../types';
import { describeAssumption } from './describeAssumption';
import './SavingsBreakdown.css';

/** Render the savings breakdown, or the unranked reason when the offer has no figure. */
export function SavingsBreakdown({ offer }: { offer: InboxChallenge }): JSX.Element {
  const { savings } = offer;
  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={offer.baseline_currency} />;
  if (!savings) {
    return <p className="savings-breakdown__text">Not ranked: {offer.unranked_reason ?? 'no savings figure was computed'}.</p>;
  }

  return (
    <div className="savings-breakdown">
      <Grid gap={4} minItemWidth="9rem">
        <Stat
          caption={savings.is_provisional ? <Badge tone="warning">Provisional</Badge> : undefined}
          label={`${savings.label}, first year`}
          size="md"
          tone={savings.first_year_net_savings_minor > 0 ? 'success' : 'default'}
          value={money(savings.first_year_net_savings_minor)}
        />
        <Stat label="Annual recurring" size="md" value={money(savings.annual_recurring_savings_minor)} />
      </Grid>
      <p className="savings-breakdown__text">
        Measured against {money(offer.baseline_monthly_minor)} / month,{' '}
        {offer.is_current_scope_version
          ? 'what you pay now on this listing.'
          : `the price you confirmed on scope v${offer.answered_scope_version_number}, the version this offer answered.`}{' '}
        Savings are potential until you actually switch.
      </p>
      {savings.assumptions.length > 0 ? (
        <div>
          <p className="savings-breakdown__lead">{savings.is_provisional ? 'Provisional, because:' : 'Assumptions:'}</p>
          <ul className="savings-breakdown__assumptions">
            {savings.assumptions.map((assumption) => <li key={assumption}>{describeAssumption(assumption)}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
