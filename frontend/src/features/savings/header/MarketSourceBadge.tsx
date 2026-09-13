/* Names the market-data source behind every card on the panel: demo data (simulated tone), USAspending with "rates not
   checked" said up front, or the source as stored. The source is chosen by MARKET_DATA_SOURCE on the server. */
import { Badge } from '../../../shared/ui';

/** Render the source badge for a market_data_source value. */
export function MarketSourceBadge({ source }: { source: string }): JSX.Element {
  if (source === 'demo_market_data') {
    return (
      <Badge size="md" tone="simulated" title="Fictional suppliers, UEIs, awards and rates for the simulator; not USAspending or GSA CALC+.">
        Source: demo market data
      </Badge>
    );
  }
  if (source === 'usaspending') {
    // The live source answers suppliers only; saying so here keeps "rates not checked" from being a surprise on each card.
    return (
      <Badge size="md" tone="info" title="Public USAspending prime awards and reported subawards. No public labor-rate source is connected yet.">
        Source: USAspending public records · rates not checked
      </Badge>
    );
  }
  return <Badge size="md" tone="info">Source: {source}</Badge>;
}
