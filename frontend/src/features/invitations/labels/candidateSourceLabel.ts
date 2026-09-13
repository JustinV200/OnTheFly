/* Where a supplier candidate came from, in plain words, with the tone that marks demo data. Every candidate shows this
   (CLAUDE.md, "Show data provenance everywhere"): a fictional demo supplier must never look like a web search result. */
import type { BadgeTone } from '../../../shared/ui';
import type { Candidate } from '../types';

export interface SourceLabel {
  label: string;
  tone: BadgeTone;
}

/** Describe a candidate's origin and provenance as one badge. */
export function candidateSourceLabel(candidate: Candidate): SourceLabel {
  if (candidate.origin === 'manually_added') {
    return { label: 'Added by you', tone: 'neutral' };
  }
  if (candidate.provenance === 'demo_data') {
    return { label: 'Demo discovery · fictional', tone: 'simulated' };
  }
  if (candidate.provenance === 'public_web') {
    return { label: 'Found on the public web', tone: 'info' };
  }
  // An unknown provenance is shown raw rather than dressed up as a known source.
  return { label: `Source: ${candidate.provenance}`, tone: 'danger' };
}

/** The host of a website, for a compact link label ("bayclean.example"). */
export function websiteHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch (error) {
    // Validated server-side; if it still can't parse, show it whole rather than hide it.
    console.warn('Candidate website did not parse as a URL', error);
    return url;
  }
}
