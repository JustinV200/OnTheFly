/* Explains the public price-to-hours estimate used in outreach. It never presents the result as market evidence,
   historical pricing or a supplier quote, and it preserves the backend's visible unavailable reason. */
import { formatMoneyText } from '../../../shared/format/formatMoneyText';
import { perPeriodWords } from '../../../shared/market/perPeriodWords';
import { Badge, Card, Stack } from '../../../shared/ui';
import type { ImpliedRate } from '../types';
import './ImpliedRateCard.css';

interface ImpliedRateCardProps {
  rate: ImpliedRate;
}

/** Render the listing's modeled implied rate or explain which public input is missing. */
export function ImpliedRateCard({ rate }: ImpliedRateCardProps): JSX.Element {
  const isAvailable = rate.status === 'available' && rate.rate_minor_per_hour !== null && rate.total_hours !== null;

  return (
    <Card
      description="A planning estimate from the price and hours already published on this listing—not a market rate or supplier quote."
      title="Price to beat"
    >
      {isAvailable ? (
        <Stack gap={2}>
          <div className="implied-rate__headline">
            <strong>{formatMoneyText(rate.rate_minor_per_hour ?? 0, rate.currency)}/hour</strong>
            <Badge tone="simulated">Modeled implied rate</Badge>
          </div>
          <p className="ui-text-sm ui-text-muted">
            {formatMoneyText(rate.price_minor ?? 0, rate.currency)} {perPeriodWords(rate.billing_cadence)} ÷ {rate.total_hours?.toLocaleString()} published hours.
          </p>
          <p className="ui-text-sm">Selected suppliers are invited to submit their own scope and price against this public baseline.</p>
        </Stack>
      ) : (
        <p className="ui-text-sm ui-text-muted">Implied rate unavailable: {rate.reason ?? 'the published scope is incomplete.'}</p>
      )}
    </Card>
  );
}
