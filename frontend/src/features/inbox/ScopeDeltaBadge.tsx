/* Renders scope delta chips for missing, added, or unstated offer elements. */
interface ScopeDeltaBadgeProps {
  label: string;
}

/** Render a small badge describing one scope delta item. */
export function ScopeDeltaBadge({ label }: ScopeDeltaBadgeProps): JSX.Element {
  return <span style={{ backgroundColor: '#fef3c7', borderRadius: '999px', marginRight: '0.25rem', padding: '0.15rem 0.5rem' }}>{label}</span>;
}
