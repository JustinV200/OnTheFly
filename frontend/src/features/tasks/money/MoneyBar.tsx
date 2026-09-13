/* A horizontal bar that shows how a starting price divides: one segment per piece (at its accepted price, or its cut
   while pending) and the remainder. Widths are proportions of server figures, for the eye only; every amount is also
   written out in the legend, so nothing depends on reading the bar. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import './MoneyBar.css';

export interface MoneyBarSegment {
  key: string;
  label: string;
  amountMinor: number;
  tone: 'piece' | 'pending' | 'remainder';
}

interface MoneyBarProps {
  label: string;
  totalMinor: number;
  currency: string;
  segments: MoneyBarSegment[];
}

/** Render the bar and its legend. */
export function MoneyBar({ label, totalMinor, currency, segments }: MoneyBarProps): JSX.Element {
  return (
    <figure className="money-bar">
      <figcaption className="money-bar__caption">{label}</figcaption>
      <div aria-hidden="true" className="money-bar__track">
        {segments.map((segment) => (
          <span
            className={`money-bar__segment money-bar__segment--${segment.tone}`}
            key={segment.key}
            style={{ flexGrow: totalMinor > 0 ? Math.max(segment.amountMinor, 0) / totalMinor : 0 }}
          />
        ))}
      </div>
      <ul className="money-bar__legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span aria-hidden="true" className={`money-bar__swatch money-bar__swatch--${segment.tone}`} />
            <span className="money-bar__legend-label">{segment.label}</span>
            <MoneyDisplay amountMinor={segment.amountMinor} currency={currency} />
          </li>
        ))}
      </ul>
    </figure>
  );
}
