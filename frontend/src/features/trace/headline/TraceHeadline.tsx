/* The number the trace is about, at the top: the offer's potential first-year savings as the server computed them, the
   two monthly prices they compare, and a row of links down to each step. Every figure is the server's; an unranked offer
   gets its reason in place of a figure (roadmap 09, "Trace one number all the way down"). */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, Card, Stat } from '../../../shared/ui';
import type { OfferTrace } from '../types';
import { TracePath } from './TracePath';
import './TraceHeadline.css';

/** Render the headline card for one offer's trace. */
export function TraceHeadline({ trace }: { trace: OfferTrace }): JSX.Element {
  const { savings, offer, baseline, scope_version: scope, transactions } = trace;
  const currency = savings?.currency ?? baseline.currency;
  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={currency} />;
  // With a figure, the compared prices are the ones the savings used; without one, the offer's and baseline's own.
  const offerMonthly = savings?.offer_monthly_minor ?? offer.normalized_monthly_minor;
  const baselineMonthly = savings?.baseline_monthly_minor ?? baseline.monthly_minor;

  return (
    <Card className="trace-headline" label="The number being traced">
      <div className="trace-headline__top">
        {savings ? (
          <Stat
            caption={(
              <>
                {savings.is_provisional ? <Badge tone="warning">Provisional</Badge> : null}
                <ProvenanceBadge kind="offer" value={offer.provenance} />
                <span>Potential until a switch actually happens.</span>
              </>
            )}
            label={`${savings.label}, first year`}
            size="xl"
            // Green only for an actual saving; a negative figure stays neutral, and its minus sign says what it is.
            tone={savings.first_year_net_savings_minor > 0 ? 'success' : 'default'}
            value={money(savings.first_year_net_savings_minor)}
          />
        ) : (
          <Stat
            caption={<><ProvenanceBadge kind="offer" value={offer.provenance} /><span>Not ranked: {offer.unranked_reason ?? 'no savings figure was computed'}.</span></>}
            label="Potential savings"
            size="xl"
            value={<span className="trace-headline__none">No figure</span>}
          />
        )}
        <dl className="trace-headline__compare">
          <div>
            <dt>Offer from {offer.challenger_name}</dt>
            <dd>{money(offerMonthly)} <span className="trace-headline__unit">/ month</span></dd>
          </div>
          <div>
            <dt>{scope.is_listing_current_version ? 'What you pay now' : `Your price on scope v${scope.version_number}`}</dt>
            <dd>{money(baselineMonthly)} <span className="trace-headline__unit">/ month</span></dd>
          </div>
        </dl>
      </div>
      <TracePath scopeVersionNumber={scope.version_number} transactionCount={transactions.length} />
    </Card>
  );
}
