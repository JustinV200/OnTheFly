/* An offer row's potential-savings cell: the server's first-year figure, its Provisional flag and qualifier, or why the
   offer has no figure. The assumptions behind "Provisional" are one click away in the offer drawer, which the row opens.
   Nothing is computed here; the sign only picks the tone, and the minus sign says it too. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { Badge } from '../../../shared/ui';
import type { InboxChallenge } from '../types';
import './SavingsFigure.css';

// The plain server label; any other label ("Potential savings (scope gaps)") qualifies the figure and is shown with it.
const PLAIN_LABEL = 'Potential savings';

/** Render the compact savings figure for one ranked offer. */
export function SavingsFigure({ offer }: { offer: InboxChallenge }): JSX.Element {
  const { savings } = offer;
  if (!savings) {
    return (
      <div className="savings-figure">
        <Badge tone="neutral">Not ranked</Badge>
        <span className="savings-figure__note">{offer.unranked_reason ?? 'No savings figure was computed'}</span>
      </div>
    );
  }

  const amount = savings.first_year_net_savings_minor;
  return (
    <div className="savings-figure">
      <div className="savings-figure__amount">
        <span className={amount > 0 ? 'savings-figure__money savings-figure__money--positive' : 'savings-figure__money'}>
          <MoneyDisplay amountMinor={amount} currency={offer.baseline_currency} />
        </span>
        <span className="savings-figure__unit">first year</span>
      </div>
      <div className="savings-figure__flags">
        {savings.is_provisional ? <Badge tone="warning">Provisional</Badge> : null}
        {savings.label === PLAIN_LABEL ? null : <span className="savings-figure__note">{savings.label}</span>}
      </div>
      {offer.is_current_scope_version ? null : (
        <span className="savings-figure__note">vs your scope v{offer.answered_scope_version_number} price</span>
      )}
    </div>
  );
}
