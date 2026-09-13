/* The Charges part of Signals: only the unusual charges at first, since every charge is already listed under
   Transactions, with "Show all N charges" swapping in the full reading. Each charge is listed once either way.
   A charge the circuit could not judge is counted as not judged, never as "looks normal". */
import { useState } from 'react';

import { Button } from '../../../../shared/ui';
import type { ChargeNovelty } from '../types';
import { ChargeReviewList } from './ChargeReviewList';

interface ChargeSignalsProps {
  charges: ChargeNovelty[];
}

/** Render unusual charges (or a sentence saying there are none) with a toggle to every charge's reading. */
export function ChargeSignals({ charges }: ChargeSignalsProps): JSX.Element {
  const [isShowingAll, setIsShowingAll] = useState(false);

  // No posted charges: ChargeReviewList says nothing was checked, and there is nothing to expand.
  if (charges.length === 0) {
    return <ChargeReviewList charges={charges} />;
  }

  const unusual = charges.filter((charge) => charge.status === 'unusual');
  const typicalCount = charges.filter((charge) => charge.status === 'typical').length;
  const notJudgedCount = charges.length - unusual.length - typicalCount;

  return (
    <>
      {isShowingAll ? <ChargeReviewList charges={charges} /> : null}
      {!isShowingAll && unusual.length > 0 ? <ChargeReviewList charges={unusual} /> : null}
      {!isShowingAll && unusual.length === 0 ? (
        <p className="ui-text-sm ui-text-muted">
          No unusual charges. {typicalCount} looked like earlier charges
          {notJudgedCount > 0 ? `; ${notJudgedCount} could not be judged yet` : ''}.
        </p>
      ) : null}
      <div>
        <Button aria-expanded={isShowingAll} onClick={() => setIsShowingAll((current) => !current)} size="sm" variant="ghost">
          {isShowingAll ? 'Show unusual charges only' : `Show all ${charges.length} ${charges.length === 1 ? 'charge' : 'charges'}`}
        </Button>
      </div>
    </>
  );
}
