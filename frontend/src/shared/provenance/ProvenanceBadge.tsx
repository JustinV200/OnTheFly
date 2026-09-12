/* Shows where a figure came from, beside the figure. It labels origin only and never implies verification. */
import { Pill } from '../components/Pill';
import { ProvenanceKind, provenanceLabel } from './provenanceLabel';

interface ProvenanceBadgeProps {
  kind: ProvenanceKind;
  value: string;
}

/** Render a compact provenance pill with its explanation on hover. */
export function ProvenanceBadge({ kind, value }: ProvenanceBadgeProps): JSX.Element {
  const label = provenanceLabel(kind, value);
  return (
    <Pill title={label.explanation} tone={label.tone}>
      {kind === 'financial' ? 'source: ' : 'offer: '}
      {label.text}
    </Pill>
  );
}
