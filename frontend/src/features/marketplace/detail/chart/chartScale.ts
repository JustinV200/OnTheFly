/* Geometry for the offer chart: the price axis ticks and the linear maps from price and time to SVG coordinates.
   Chart layout only. The prices plotted are the server's normalized monthly figures; nothing here produces a price
   anyone reads as a price, only where to draw one. Tick values are round dollar amounts for gridlines. */

export interface LinearScale {
  // Map a domain value (minor units, or epoch milliseconds) to a pixel position.
  toPixel: (value: number) => number;
}

// Axis ticks never step below one whole dollar, so every tick label is a round amount.
const MIN_STEP_MINOR = 100;

/** Return 3–6 round tick values (minor units) spanning min..max, widening a zero-height range so it still has an axis. */
export function priceTicks(minMinor: number, maxMinor: number, targetCount = 4): number[] {
  let low = minMinor;
  let high = maxMinor;
  if (low === high) {
    // One distinct price: open a band around it so the dot sits mid-chart instead of on a collapsed axis.
    const pad = Math.max(Math.round(Math.abs(low) * 0.05), MIN_STEP_MINOR);
    low -= pad;
    high += pad;
  }

  const rawStep = (high - low) / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const roundStep = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
  const step = Math.max(MIN_STEP_MINOR, Math.round(roundStep));

  const first = Math.floor(low / step) * step;
  const last = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= last; value += step) {
    ticks.push(value);
  }
  return ticks;
}

/** Map domain [start, end] onto pixels [from, to]; a zero-width domain maps everything to the middle. */
export function linearScale(start: number, end: number, from: number, to: number): LinearScale {
  const span = end - start;
  return {
    toPixel: (value) => (span === 0 ? (from + to) / 2 : from + ((value - start) / span) * (to - from)),
  };
}

/** Return the time domain for the points, padded a little on both sides so the first and last dots clear the edges. */
export function timeDomain(times: number[]): [number, number] {
  const earliest = Math.min(...times);
  const latest = Math.max(...times);
  // Offers seconds apart (a seeded demo) or at the same instant still get a readable spread.
  const span = Math.max(latest - earliest, 30 * 60 * 1000);
  const pad = span * 0.06;
  const middle = (earliest + latest) / 2;
  return latest === earliest ? [middle - span / 2 - pad, middle + span / 2 + pad] : [earliest - pad, latest + pad];
}
