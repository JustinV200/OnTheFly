/* Shows scope completeness as a bar plus percentage, always beside a price, never replaced by it.
   The percentage in words carries the meaning; the bar's colour only reinforces it. */
import './ScopeCompleteness.css';

/** Render a 0–1 completeness score as a labelled bar. */
export function ScopeCompleteness({ score }: { score: number }): JSX.Element {
  const percent = Math.round(score * 100);
  const level = percent >= 90 ? 'high' : percent >= 60 ? 'partial' : 'low';
  // Clamped for the bar only, so a malformed score can't draw past the track; the text still shows the real value.
  const barPercent = Math.min(100, Math.max(0, percent));

  return (
    <span className={`scope-completeness scope-completeness--${level}`}>
      <span aria-hidden="true" className="scope-completeness__track">
        <span className="scope-completeness__fill" style={{ width: `${barPercent}%` }} />
      </span>
      <span className="scope-completeness__text">{percent}% of scope</span>
    </span>
  );
}
