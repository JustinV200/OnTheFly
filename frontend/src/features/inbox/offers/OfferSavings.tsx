/* Shows one offer's potential savings, or says plainly why it has none.
   For an offer on an earlier scope version it also names the price those savings were measured against. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { SavingsCell } from '../SavingsCell';
import type { SavingsResponse } from '../types';

// The fields shared by inbox and comparison rows that decide what this cell can honestly show.
interface SavingsOffer {
  challenge_id: string | null;
  savings: SavingsResponse | null;
  unranked_reason: string | null;
  is_current_scope_version: boolean;
  answered_scope_version_number: number;
  baseline_monthly_minor: number;
  baseline_currency: string;
}

/** Render savings with its trace link, the unranked reason when there is no figure, and any earlier baseline. */
export function OfferSavings({ offer }: { offer: SavingsOffer }): JSX.Element {
  if (!offer.savings) {
    return <span>Not ranked: {offer.unranked_reason ?? 'no savings figure was computed'}.</span>;
  }

  return (
    <div>
      <SavingsCell challengeId={offer.challenge_id ?? undefined} currency={offer.baseline_currency} savings={offer.savings} />
      {offer.is_current_scope_version ? null : (
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>
          Measured against <MoneyDisplay amountMinor={offer.baseline_monthly_minor} currency={offer.baseline_currency} /> / month, the
          price you confirmed on scope v{offer.answered_scope_version_number}.
        </div>
      )}
    </div>
  );
}
