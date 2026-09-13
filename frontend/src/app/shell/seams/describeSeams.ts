/* Turns /api/demo/status counts into the words the demo-data chip shows: a short form for the bar and the full
   sentences for its panel. Both come from stored records, so a label can't drift from what is on screen
   (roadmap 09, "Honest labeling of the demo's seams"). */
import type { DemoStatus } from './demoStatusTypes';

/** The chip's compact label, stating both seams at once, e.g. "Fixture spend · 2 simulated offers". */
export function describeSeamsShort(status: DemoStatus): string {
  return `${describeFinancialShort(status.financial.provenance)} · ${describeOffersShort(status.offers)}`;
}

/** Full sentence for the financial data seam. */
export function describeFinancial(provenance: string[]): string {
  if (provenance.length === 0) {
    return 'Nothing imported yet.';
  }
  if (provenance.every((value) => value === 'fixture')) {
    return 'Demo fixture transactions (labeled "fixture"), not a live bank connection.';
  }
  return `From ${provenance.join(', ')} sources, each labeled beside its figures.`;
}

/** Full sentence for the counteroffer seam. */
export function describeOffers(offers: DemoStatus['offers']): string {
  if (offers.total === 0) {
    return 'None yet.';
  }
  if (offers.genuine === 0) {
    return `All ${offers.total} shown are simulated demo data. No genuine counteroffer has arrived.`;
  }
  const simulated = offers.demo > 0 ? `; the other ${offers.demo} are simulated demo data` : '';
  return `${offers.genuine} genuine (${offers.captured_off_platform} captured off-platform)${simulated}.`;
}

/** Full sentence for the outreach seam, when the backend reports one. */
export function describeOutreach(outreach: NonNullable<DemoStatus['outreach']>): string {
  return outreach.delivers_real_email
    ? `${outreach.channel_label}. Invitations are real email, sent only after owner approval.`
    : `${outreach.channel_label}. Approved invitations are stored for review; no email leaves this machine.`;
}

// info: the normal demo, where every figure is fixture, sandbox or simulated data and says so; a label, not a problem.
// warning: real and demo data sit side by side, where one can be mistaken for the other.
// neutral: production spend only and no simulated offers.
export type SeamTone = 'info' | 'warning' | 'neutral';

/** The chip's tone for a loaded status. Warning is kept for genuinely mixed states, so it still means something. */
export function seamTone(status: DemoStatus): SeamTone {
  const { has_production_data: hasProductionData, provenance } = status.financial;
  const mixesRealAndDemoSpend = hasProductionData && provenance.some((value) => value !== 'production');
  const mixesGenuineAndSimulatedOffers = status.offers.genuine > 0 && status.offers.demo > 0;
  if (mixesRealAndDemoSpend || mixesGenuineAndSimulatedOffers) {
    return 'warning';
  }
  return status.offers.all_simulated || !hasProductionData ? 'info' : 'neutral';
}

function describeFinancialShort(provenance: string[]): string {
  if (provenance.length === 0) {
    return 'No spend imported';
  }
  if (provenance.every((value) => value === 'fixture')) {
    return 'Fixture spend';
  }
  if (provenance.every((value) => value === 'sandbox')) {
    return 'Sandbox spend';
  }
  return 'Mixed-source spend';
}

function describeOffersShort(offers: DemoStatus['offers']): string {
  if (offers.total === 0) {
    return 'no offers yet';
  }
  if (offers.genuine === 0) {
    return `${offers.total} simulated ${offers.total === 1 ? 'offer' : 'offers'}`;
  }
  return `${offers.genuine} genuine of ${offers.total} offers`;
}
