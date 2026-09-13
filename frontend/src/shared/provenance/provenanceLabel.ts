/* Maps stored provenance values to the exact on-screen labels CLAUDE.md prescribes, with a tone and explanation.
   Unknown values render as a visible "unlabeled" warning: an unlabeled figure is a bug (roadmap 09, "Provenance audit"). */
import type { PillTone } from '../components/Pill';

export type ProvenanceKind = 'financial' | 'offer';

export interface ProvenanceLabel {
  text: string;
  tone: PillTone;
  explanation: string;
}

const FINANCIAL_LABELS: Record<string, ProvenanceLabel> = {
  production: { text: 'production', tone: 'success', explanation: 'From a connected live business account.' },
  sandbox: { text: 'sandbox', tone: 'info', explanation: "From a provider's sandbox, not a live account." },
  imported: { text: 'imported', tone: 'info', explanation: 'From an imported file, not a live connection.' },
  fixture: {
    text: 'fixture · demo data',
    tone: 'simulated',
    explanation: 'Checked-in demo transactions, not a real bank account.',
  },
};

const OFFER_LABELS: Record<string, ProvenanceLabel> = {
  challenger_submitted: {
    text: 'challenger-submitted',
    tone: 'success',
    explanation: 'Submitted through the platform by a real business.',
  },
  captured_off_platform: {
    text: 'captured from an off-platform response',
    tone: 'success',
    explanation: 'A real quote received outside the platform and entered with its original timestamp.',
  },
  demo_data: {
    text: 'demo data · simulated',
    tone: 'simulated',
    explanation: 'Made by a seeded demo business. Not a real offer.',
  },
  incumbent_baseline: {
    text: 'current price',
    tone: 'neutral',
    explanation: "The owner's confirmed current price that offers are compared against.",
  },
};

/** Return the display label for one provenance value of the given kind. */
export function provenanceLabel(kind: ProvenanceKind, value: string): ProvenanceLabel {
  const labels = kind === 'financial' ? FINANCIAL_LABELS : OFFER_LABELS;
  return (
    labels[value] ?? {
      text: `unlabeled: ${value}`,
      tone: 'danger',
      explanation: 'This provenance value has no label. Treat the figure as unverified.',
    }
  );
}
