/* Step 1 of the offer trace: the potential-savings figure and its arithmetic, or why this offer has none.
   Every figure comes from the server; an unranked offer gets its reason, never a figure made up here. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { TraceStep } from './TraceStep';
import type { OfferTrace } from './types';

interface SavingsStepProps {
  savings: OfferTrace['savings'];
  unrankedReason: string | null;
  // The version the offer answered, named when it isn't the listing's current one, since its baseline is that version's price.
  earlierScopeVersion: number | null;
}

/** Render the first trace step for one offer. */
export function SavingsStep({ savings, unrankedReason, earlierScopeVersion }: SavingsStepProps): JSX.Element {
  if (!savings) {
    return (
      <TraceStep leadsTo="The offer being compared" step={1} title="No potential savings figure">
        <p style={{ margin: 0 }}>This offer is not ranked: {unrankedReason ?? 'no savings figure was computed'}.</p>
      </TraceStep>
    );
  }

  const money = (amountMinor: number): JSX.Element => <MoneyDisplay amountMinor={amountMinor} currency={savings.currency} />;
  const baselineName = earlierScopeVersion === null ? 'current' : `price on scope v${earlierScopeVersion}`;
  return (
    <TraceStep leadsTo="The offer being compared" step={1} title={<>{savings.label}: {money(savings.first_year_net_savings_minor)} first year</>}>
      <p style={{ margin: '0 0 0.25rem' }}>
        ({money(savings.baseline_monthly_minor)} {baselineName} − {money(savings.offer_monthly_minor)} offer) × 12 months ={' '}
        <strong>{money(savings.annual_recurring_savings_minor)}</strong> annual recurring, then first-year costs subtracted ={' '}
        <strong>{money(savings.first_year_net_savings_minor)}</strong>.
      </p>
      {savings.is_provisional ? <p style={{ margin: '0 0 0.25rem' }}>Provisional, because:</p> : null}
      <ul style={{ margin: 0 }}>{savings.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
      <p style={{ color: '#475569', margin: '0.25rem 0 0' }}>Potential until a switch actually happens. Computed by the server, not estimated.</p>
    </TraceStep>
  );
}
