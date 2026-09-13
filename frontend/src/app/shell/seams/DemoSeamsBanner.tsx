/* States the demo's seams on every screen: what the financial data is and whether any offer is genuine.
   Driven by stored records, and shown as a warning when unavailable, never hidden (roadmap 09, "Honest labeling of the demo's seams").
   A compact full-width strip above the top bar: small type, but the full sentences, never an abbreviation. */
import type { ReactNode } from 'react';

import { useApiQuery } from '../../../shared/api/useApiQuery';
import { Icon, IconName, Spinner } from '../../../shared/ui';
import type { DemoStatus } from './demoStatusTypes';
import './DemoSeamsBanner.css';

// The endpoint is a few counts, so a short poll is cheap and keeps the label current right after
// an offer lands (a stale "none yet" beside a fresh offer would undercut the label).
const POLL_INTERVAL_MS = 5000;

/** Render the always-visible demo-honesty strip. */
export function DemoSeamsBanner(): JSX.Element {
  const { data, error } = useApiQuery<DemoStatus>('/api/demo/status', { pollIntervalMs: POLL_INTERVAL_MS });

  if (!data) {
    return error ? (
      <Strip tone="danger">
        <span className="seams-strip__item">Demo data labels unavailable ({error.message}). Treat every figure as unverified.</span>
      </Strip>
    ) : (
      <Strip tone="loading">
        <span className="seams-strip__item">Checking where this demo’s data comes from…</span>
      </Strip>
    );
  }

  return (
    <Strip tone={data.offers.all_simulated || !data.financial.has_production_data ? 'simulated' : 'neutral'}>
      <span className="seams-strip__item">
        <strong>Financial data: </strong>
        {describeFinancial(data.financial.provenance)}
      </span>
      <span className="seams-strip__item">
        <strong>Counteroffers: </strong>
        {describeOffers(data.offers)}
      </span>
    </Strip>
  );
}

function describeFinancial(provenance: string[]): string {
  if (provenance.length === 0) {
    return 'nothing imported yet.';
  }
  if (provenance.every((value) => value === 'fixture')) {
    return 'demo fixture transactions (labeled "fixture"), not a live bank connection.';
  }
  return `from ${provenance.join(', ')} sources, each labeled beside its figures.`;
}

function describeOffers(offers: DemoStatus['offers']): string {
  if (offers.total === 0) {
    return 'none yet.';
  }
  if (offers.genuine === 0) {
    return `all ${offers.total} shown are simulated demo data. No genuine counteroffer has arrived.`;
  }
  const simulated = offers.demo > 0 ? `; the other ${offers.demo} are simulated demo data` : '';
  return `${offers.genuine} genuine (${offers.captured_off_platform} captured off-platform)${simulated}.`;
}

type StripTone = 'loading' | 'neutral' | 'simulated' | 'danger';

const TONE_ICONS: Record<Exclude<StripTone, 'loading'>, IconName> = {
  neutral: 'info',
  simulated: 'alert-triangle',
  danger: 'alert-circle',
};

interface StripProps {
  tone: StripTone;
  children: ReactNode;
}

function Strip({ tone, children }: StripProps): JSX.Element {
  return (
    <aside aria-label="Demo data labels" className={`seams-strip seams-strip--${tone}`}>
      <div className="seams-strip__inner">
        {tone === 'loading' ? <Spinner className="seams-strip__icon" size="sm" /> : <Icon className="seams-strip__icon" name={TONE_ICONS[tone]} size={14} />}
        <div className="seams-strip__items">{children}</div>
      </div>
    </aside>
  );
}
