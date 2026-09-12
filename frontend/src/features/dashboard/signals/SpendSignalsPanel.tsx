/* Shows the fly-brain spend signals for one private expense: baseline basis, price changes, unusual charges.
   Owner-only data; this panel is never reused on public pages. */
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { FlyBrainBadge } from '../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../shared/flybrain/FlyBrainNote';
import type { FlyBrainAttribution, FlyBrainComponent } from '../../../shared/flybrain/types';
import { BaselineBasisSummary } from './BaselineBasisSummary';
import { ChargeReviewList } from './ChargeReviewList';
import { formatNotAnalyzedSummary } from './formatSignals';
import { PriceChangeList } from './PriceChangeList';
import type { NotAnalyzedTransaction } from './types';
import { useSpendSignals } from './useSpendSignals';

interface SpendSignalsPanelProps {
  expenseId: string;
}

/** Render the spend-signals report for one expense, labelling each section with its circuit. */
export function SpendSignalsPanel({ expenseId }: SpendSignalsPanelProps): JSX.Element {
  const { report, isLoading, error } = useSpendSignals(expenseId);

  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (error || !report) {
    return <p role="alert">{error ?? 'Spend signals are unavailable.'}</p>;
  }

  const { baseline } = report;

  return (
    <section aria-label="Spend signals" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '1rem', padding: '0.75rem 1rem' }}>
      <h4 style={{ margin: '0 0 0.5rem' }}>Spend signals</h4>
      <NotAnalyzedNote transactions={report.not_analyzed_transactions} />

      <SectionHeading title="Price" attribution={findAttribution(report.fly_brain, 'compound_eye')} />
      {baseline ? (
        <>
          <BaselineBasisSummary baseline={baseline} />
          <PriceChangeList priceLevels={report.price_levels} currency={baseline.currency} />
        </>
      ) : (
        // No posted charges: there is no baseline, which must not read as a $0 price.
        <p style={{ color: '#475569', margin: '0.25rem 0' }}>
          <strong>No baseline:</strong> no charge from this vendor has posted, so there is no price to explain or check for changes.
        </p>
      )}

      <SectionHeading
        title={
          report.unusual_charge_count > 0
            ? `Charges · ${report.unusual_charge_count} unusual`
            : 'Charges'
        }
        attribution={findAttribution(report.fly_brain, 'mushroom_body_novelty')}
      />
      <ChargeReviewList charges={report.charges} />

      <FlyBrainNote attributions={report.fly_brain} />
    </section>
  );
}

function NotAnalyzedNote({ transactions }: { transactions: NotAnalyzedTransaction[] }): JSX.Element | null {
  // The transaction list above shows every stored row; say which ones these signals skipped.
  if (transactions.length === 0) {
    return null;
  }
  return (
    <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
      Only posted charges are analyzed. Left out: {formatNotAnalyzedSummary(transactions)} (listed above with their status).
    </p>
  );
}

function SectionHeading({ title, attribution }: { title: string; attribution: FlyBrainAttribution | undefined }): JSX.Element {
  return (
    <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
      <strong>{title}</strong>
      {attribution ? <FlyBrainBadge attribution={attribution} /> : null}
    </div>
  );
}

function findAttribution(attributions: FlyBrainAttribution[], component: FlyBrainComponent): FlyBrainAttribution | undefined {
  return attributions.find((attribution) => attribution.component === component);
}
