/* The open-bidding offer chart: each public offer as a dot, x = when it was submitted, y = the server's normalized
   monthly price, with an optional dashed line at the listing's current price. Dots only, never a connecting line:
   offers are independent bids ranked by scope first, not a price moving over time.
   No challenger identity is drawn, labelled or described. The Leaderboard tab is the accessible data table. */
import { useId, useState } from 'react';

import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import type { LeaderboardEntry } from '../../types';
import { linearScale, priceTicks, timeDomain } from './chartScale';
import { axisMoneyText, axisTimeText, describeOffer, submittedTime } from './chartText';
import { OfferChartLegend } from './OfferChartLegend';
import { OfferReadout } from './OfferReadout';
import { useElementWidth } from './useElementWidth';
import './OfferChart.css';

const HEIGHT = 220;
const MARGIN = { top: 12, right: 16, bottom: 28, left: 60 };
const DOT_RADIUS = 6;
// A 24px hit area around each 12px dot, so a pointer or finger doesn't have to land dead centre.
const HIT_RADIUS = 12;

interface OfferChartProps {
  // Two or more offers to plot, all in the listing's currency; the caller filters out unranked ones.
  entries: LeaderboardEntry[];
  currentScopeVersion: number;
  currency: string;
  // The listing's current price, only when it is billed monthly and so on the same footing as the plotted prices.
  referencePriceMinor: number | null;
}

/** Render the offer chart as a figure with its legend, a details readout and a caption. */
export function OfferChart({ entries, currentScopeVersion, currency, referencePriceMinor }: OfferChartProps): JSX.Element {
  const captionId = useId();
  const [plotRef, width] = useElementWidth<HTMLDivElement>(640);
  const [activeId, setActiveId] = useState<string | null>(null);

  const prices = entries.map((entry) => entry.normalized_price_minor);
  const ticks = priceTicks(Math.min(...prices, referencePriceMinor ?? Infinity), Math.max(...prices, referencePriceMinor ?? -Infinity));
  const priceScale = linearScale(ticks[0], ticks[ticks.length - 1], HEIGHT - MARGIN.bottom, MARGIN.top);
  const times = entries.map(submittedTime);
  const [timeStart, timeEnd] = timeDomain(times);
  const timeScale = linearScale(timeStart, timeEnd, MARGIN.left, width - MARGIN.right);
  const earliest = Math.min(...times);
  const latest = Math.max(...times);

  const activeEntry = entries.find((entry) => entry.challenge_id === activeId) ?? null;
  const hasEarlierScope = entries.some((entry) => !entry.is_current_scope_version);

  return (
    <figure className="offer-chart">
      <OfferChartLegend hasCurrentScope={entries.some((entry) => entry.is_current_scope_version)} hasEarlierScope={hasEarlierScope} hasReference={referencePriceMinor !== null} />

      <div className="offer-chart__plot" ref={plotRef}>
        <svg aria-labelledby={captionId} className="offer-chart__svg" height={HEIGHT} role="group" viewBox={`0 0 ${width} ${HEIGHT}`} width="100%">
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="offer-chart__grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={priceScale.toPixel(tick)} y2={priceScale.toPixel(tick)} />
              <text className="offer-chart__axis-text" dominantBaseline="middle" textAnchor="end" x={MARGIN.left - 8} y={priceScale.toPixel(tick)}>
                {axisMoneyText(tick, currency)}
              </text>
            </g>
          ))}

          {referencePriceMinor !== null ? (
            <line
              className="offer-chart__reference"
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={priceScale.toPixel(referencePriceMinor)}
              y2={priceScale.toPixel(referencePriceMinor)}
            />
          ) : null}

          {/* Time is labelled at the chart's two ends as "First" and "Latest" rather than under each dot: offers minutes
              apart would print their labels on top of each other, and gridded dates would suggest a regular series. */}
          {latest === earliest ? (
            <text className="offer-chart__axis-text" textAnchor="middle" x={width / 2} y={HEIGHT - 6}>All at {axisTimeText(earliest)}</text>
          ) : (
            <>
              <text className="offer-chart__axis-text" textAnchor="start" x={0} y={HEIGHT - 6}>First {axisTimeText(earliest)}</text>
              <text className="offer-chart__axis-text" textAnchor="end" x={width} y={HEIGHT - 6}>Latest {axisTimeText(latest)}</text>
            </>
          )}

          {entries.map((entry, index) => {
            const description = describeOffer(entry, currentScopeVersion);
            const isActive = entry.challenge_id === activeId;
            const x = timeScale.toPixel(times[index]);
            const y = priceScale.toPixel(entry.normalized_price_minor);
            return (
              <g
                aria-label={description}
                className={isActive ? 'offer-chart__point is-active' : 'offer-chart__point'}
                key={entry.challenge_id}
                onBlur={() => setActiveId(null)}
                onClick={() => setActiveId(entry.challenge_id)}
                onFocus={() => setActiveId(entry.challenge_id)}
                onMouseEnter={() => setActiveId(entry.challenge_id)}
                onMouseLeave={() => setActiveId(null)}
                role="img"
                tabIndex={0}
              >
                <title>{description}</title>
                <circle className="offer-chart__hit" cx={x} cy={y} r={HIT_RADIUS} />
                <circle className="offer-chart__halo" cx={x} cy={y} r={HIT_RADIUS - 2} />
                <circle className={entry.is_current_scope_version ? 'offer-chart__dot' : 'offer-chart__dot offer-chart__dot--earlier'} cx={x} cy={y} r={isActive ? DOT_RADIUS + 1 : DOT_RADIUS} />
              </g>
            );
          })}
        </svg>
      </div>

      <OfferReadout currentScopeVersion={currentScopeVersion} entry={activeEntry} />

      <figcaption className="offer-chart__caption" id={captionId}>
        {entries.length} public offers over time, each shown as a monthly price worked out by the server
        {referencePriceMinor !== null ? (
          <>, against the current price of <MoneyDisplay amountMinor={referencePriceMinor} currency={currency} /> a month</>
        ) : null}
        . Who made each offer is never shown; the Leaderboard tab lists them as a table.
      </figcaption>
    </figure>
  );
}
