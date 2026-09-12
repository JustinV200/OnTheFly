/* Shows a simple provenance label beside financial or offer data.
   The badge is intentionally neutral and does not imply verification. */
interface ProvenanceBadgeProps {
  label: string;
}

/** Render a compact badge for a provenance label. */
export function ProvenanceBadge({ label }: ProvenanceBadgeProps): JSX.Element {
  return (
    <span
      style={{
        backgroundColor: '#eef2ff',
        borderRadius: '999px',
        fontSize: '0.8rem',
        padding: '0.15rem 0.5rem',
      }}
    >
      {label}
    </span>
  );
}
