/* Shows where a figure came from, beside the figure. It labels origin only and never implies verification.
   The "source:" / "offer:" prefix is set lighter than the value, but it stays part of the visible and spoken text. */
import { Badge } from '../ui';
import { ProvenanceKind, provenanceLabel } from './provenanceLabel';
import './ProvenanceBadge.css';

interface ProvenanceBadgeProps {
  kind: ProvenanceKind;
  value: string;
}

/** Render a compact provenance badge with its explanation on hover. */
export function ProvenanceBadge({ kind, value }: ProvenanceBadgeProps): JSX.Element {
  const label = provenanceLabel(kind, value);
  return (
    <Badge className="provenance-badge" title={label.explanation} tone={label.tone}>
      <span className="provenance-badge__kind">{kind === 'financial' ? 'source: ' : 'offer: '}</span>
      {label.text}
    </Badge>
  );
}
