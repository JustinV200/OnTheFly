/* The offer chart's legend: one key per mark actually drawn, so a muted dot is never left to colour alone to explain. */
import './OfferChart.css';

interface OfferChartLegendProps {
  hasCurrentScope: boolean;
  hasEarlierScope: boolean;
  hasReference: boolean;
}

/** Render the legend row for the marks present in this chart. */
export function OfferChartLegend({ hasCurrentScope, hasEarlierScope, hasReference }: OfferChartLegendProps): JSX.Element {
  return (
    <ul aria-label="Chart legend" className="offer-chart__legend">
      {hasCurrentScope ? (
        <li className="offer-chart__legend-item">
          <DotKey isMuted={false} />
          Offer on the current scope
        </li>
      ) : null}
      {hasEarlierScope ? (
        <li className="offer-chart__legend-item">
          <DotKey isMuted />
          Answered an earlier scope version (muted)
        </li>
      ) : null}
      {hasReference ? (
        <li className="offer-chart__legend-item">
          <svg aria-hidden="true" className="offer-chart__key" height="10" viewBox="0 0 20 10" width="20">
            <line className="offer-chart__reference" x1="0" x2="20" y1="5" y2="5" />
          </svg>
          Current price
        </li>
      ) : null}
    </ul>
  );
}

function DotKey({ isMuted }: { isMuted: boolean }): JSX.Element {
  return (
    <svg aria-hidden="true" className="offer-chart__key" height="12" viewBox="0 0 12 12" width="12">
      <circle className={isMuted ? 'offer-chart__dot offer-chart__dot--earlier' : 'offer-chart__dot'} cx="6" cy="6" r="4.5" />
    </svg>
  );
}
