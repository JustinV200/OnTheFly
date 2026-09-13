/* A full-width table row that opens a group of offers ranked apart from offers on the current scope.
   Without it, an offer scored against an older scope would read as a worse offer on today's scope. */
import type { HeadedOfferGroup } from './offerGroups';
import './OfferGroupHeadingRow.css';

const HEADINGS: Record<HeadedOfferGroup, string> = {
  earlier:
    'Answered an earlier scope version. Ranked separately: each was scored against the scope it answered, not the current one.',
  unranked: 'Not ranked: priced in a different currency from the listing, so it can’t be compared.',
};

interface OfferGroupHeadingRowProps {
  group: HeadedOfferGroup;
  colSpan: number;
}

/** Render the heading row that starts the earlier-scope or unranked group in an offers table. */
export function OfferGroupHeadingRow({ group, colSpan }: OfferGroupHeadingRowProps): JSX.Element {
  return (
    <tr className="offer-group-heading">
      <th colSpan={colSpan} scope="colgroup">
        {HEADINGS[group]}
      </th>
    </tr>
  );
}
