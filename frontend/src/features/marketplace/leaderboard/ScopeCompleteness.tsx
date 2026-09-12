/* Shows scope completeness as a bar plus percentage, always beside a price, never replaced by it. */

/** Render a 0–1 completeness score as a labelled bar. */
export function ScopeCompleteness({ score }: { score: number }): JSX.Element {
  const percent = Math.round(score * 100);
  const color = percent >= 90 ? '#047857' : percent >= 60 ? '#b45309' : '#b91c1c';
  return (
    <span style={{ alignItems: 'center', display: 'inline-flex', gap: '0.4rem' }}>
      <span aria-hidden="true" style={{ backgroundColor: '#e2e8f0', borderRadius: '999px', display: 'inline-block', height: '0.5rem', width: '5rem' }}>
        <span style={{ backgroundColor: color, borderRadius: '999px', display: 'block', height: '100%', width: `${percent}%` }} />
      </span>
      <span>{percent}% of scope</span>
    </span>
  );
}
